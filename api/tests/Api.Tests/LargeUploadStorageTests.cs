using Azure.Storage.Blobs;
using SaaSApp.BlobStorage;
using SaaSApp.Repository.Application.Contracts;
using SaaSApp.Repository.Infrastructure.Options;
using SaaSApp.Repository.Infrastructure.Storage;
using Xunit;

namespace SaaSApp.Api.Tests;

public sealed class LargeUploadStorageTests : IDisposable
{
    private const int ChunkSize = 1024;
    private static readonly Guid TenantId = Guid.Parse("11111111-2222-3333-4444-555555555555");

    private readonly string _root = Path.Combine(Path.GetTempPath(), "ezofis-large-upload-tests", Guid.NewGuid().ToString("N"));
    private readonly LocalRepositoryFileStorage _local;
    private readonly LargeUploadStorage _storage;

    public LargeUploadStorageTests()
    {
        _local = new LocalRepositoryFileStorage(
            Microsoft.Extensions.Options.Options.Create(new RepositoryFileStorageOptions { LocalRootPath = _root }));
        _storage = new LargeUploadStorage(
            new NoBlobStorage(),
            _local,
            Microsoft.Extensions.Options.Options.Create(new RepositoryLargeUploadOptions { ChunkSizeBytes = ChunkSize }));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    [Theory]
    [InlineData(0, "YmxrLTAwMDAwMA==")]
    [InlineData(7, "YmxrLTAwMDAwNw==")]
    [InlineData(123456, "YmxrLTEyMzQ1Ng==")]
    public void Block_ids_have_a_fixed_length_and_round_trip(int index, string expected)
    {
        // Azure needs every block id of a blob to have the same length: base64("blk-" + 6 digits).
        Assert.Equal(expected, LargeUploadStorage.BlockId(index));
        Assert.True(LargeUploadStorage.TryParseBlockIndex(expected, out var parsed));
        Assert.Equal(index, parsed);
    }

    [Theory]
    [InlineData("not-base64!")]
    [InlineData("aGVsbG8=")] // "hello"
    public void Foreign_block_ids_are_ignored(string blockId) =>
        Assert.False(LargeUploadStorage.TryParseBlockIndex(blockId, out _));

    [Theory]
    [InlineData(1, 1024, 1)]
    [InlineData(1024, 1024, 1)]
    [InlineData(1025, 1024, 2)]
    [InlineData(10L * 1024 * 1024 * 1024, 16 * 1024 * 1024, 640)]
    public void Total_chunks_rounds_up(long fileSize, int chunkSize, int expected) =>
        Assert.Equal(expected, LargeUploadStorage.TotalChunks(fileSize, chunkSize));

    [Fact]
    public void Without_blob_storage_the_api_writes_chunks_to_local_disk()
    {
        Assert.Equal(LargeUploadMode.ApiLocal, _storage.ResolveMode("EZOFIS"));
        Assert.Equal(1, _storage.MaxConcurrencyFor(LargeUploadMode.ApiLocal));
        Assert.Equal(ChunkSize, _storage.ChunkSize);
        Assert.Throws<NotSupportedException>(() => _storage.ResolveMode("SHAREPOINT"));
    }

    [Fact]
    public async Task Chunks_resume_and_commit_into_the_original_bytes()
    {
        var bytes = RandomBytes(ChunkSize * 2 + 300); // 3 chunks, last one short
        const string path = "monitor/repo/big.pdf";

        // First two chunks arrive, then the connection drops.
        await Stage(path, bytes, 0);
        await Stage(path, bytes, 1);

        var uploaded = await _storage.ListUploadedChunksAsync(LargeUploadMode.ApiLocal, TenantId, path, ChunkSize, bytes.Length, default);
        Assert.Equal(new[] { 0, 1 }, uploaded);

        // Completing now reports exactly what is missing.
        var incomplete = await Assert.ThrowsAsync<LargeUploadIncompleteException>(() =>
            _storage.CommitAsync(LargeUploadMode.ApiLocal, TenantId, path, ChunkSize, bytes.Length, "application/pdf", default));
        Assert.Equal(new[] { 2 }, incomplete.MissingChunks);

        // Resume: send the last chunk and commit.
        await Stage(path, bytes, 2);
        var size = await _storage.CommitAsync(LargeUploadMode.ApiLocal, TenantId, path, ChunkSize, bytes.Length, "application/pdf", default);

        Assert.Equal(bytes.Length, size);
        await using var stored = await _local.OpenReadAsync(TenantId, path, "EZOFIS");
        Assert.Equal(bytes, await ReadAll(stored));
    }

    [Fact]
    public async Task Discard_removes_an_unfinished_upload()
    {
        var bytes = RandomBytes(ChunkSize * 2);
        const string path = "monitor/repo/abandoned.pdf";
        await Stage(path, bytes, 0);

        await _storage.DiscardAsync(LargeUploadMode.ApiLocal, TenantId, path, default);

        var uploaded = await _storage.ListUploadedChunksAsync(LargeUploadMode.ApiLocal, TenantId, path, ChunkSize, bytes.Length, default);
        Assert.Empty(uploaded);
    }

    [Fact]
    public async Task Local_copy_duplicates_a_stored_file_without_the_api_buffering_it()
    {
        var bytes = RandomBytes(5000);
        await _local.SaveAsync(TenantId, Guid.NewGuid(), Guid.NewGuid(), "a.pdf", new MemoryStream(bytes), "EZOFIS", "monitor/a.pdf");

        var copied = await _local.CopyAsync(TenantId, "monitor/a.pdf", "archive/Repo/a_v1.pdf", "EZOFIS");

        Assert.Equal("archive/Repo/a_v1.pdf", copied);
        await using var stored = await _local.OpenReadAsync(TenantId, copied, "EZOFIS");
        Assert.Equal(bytes, await ReadAll(stored));
    }

    private Task Stage(string path, byte[] bytes, int index)
    {
        var start = index * ChunkSize;
        var length = Math.Min(ChunkSize, bytes.Length - start);
        return _storage.StageChunkAsync(
            LargeUploadMode.ApiLocal,
            TenantId,
            path,
            index,
            ChunkSize,
            new MemoryStream(bytes, start, length, writable: false),
            default);
    }

    private static byte[] RandomBytes(int length)
    {
        var bytes = new byte[length];
        new Random(42).NextBytes(bytes);
        return bytes;
    }

    private static async Task<byte[]> ReadAll(Stream stream)
    {
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer);
        return buffer.ToArray();
    }

    /// <summary>Blob storage that is not configured (local-disk fallback).</summary>
    private sealed class NoBlobStorage : IEzofisBlobStorageService
    {
        public bool IsConfigured => false;

        public BlobContainerClient GetTenantContainer(Guid tenantId, bool createIfNotExists = true) =>
            throw new InvalidOperationException("Blob storage is not configured.");

        public BlobClient GetBlobClient(Guid tenantId, string blobPath, bool createContainerIfNotExists = true) =>
            throw new InvalidOperationException("Blob storage is not configured.");
    }
}
