"""Name embeddings score product codes as the same item. Numbers stay numeric."""
import pytest

from app.ap_skills.name_embedder import NameEmbedder


class _StubEmbed:
    async def embed(self, texts):
        out = []
        for text in texts:
            lowered = text.lower()
            # Same product family shares the first dimensions; the code is a small extra.
            barrier = 1.0 if "barrier" in lowered else 0.0
            code = 0.05 if "sbs1001" in lowered else 0.0
            other = 1.0 if "widget" in lowered else 0.0
            out.append([barrier, code, other, 0.2])
        return out


@pytest.mark.asyncio
async def test_extra_product_code_scores_higher_than_letter_rule():
    embedder = NameEmbedder(_StubEmbed())
    await embedder.warm(["SAFETY BARRIER SYSTEM (SBS1001)", "Safety Barrier System"])
    score = embedder.score("SAFETY BARRIER SYSTEM (SBS1001)", "Safety Barrier System")
    assert score > 0.9


@pytest.mark.asyncio
async def test_different_product_stays_low():
    embedder = NameEmbedder(_StubEmbed())
    await embedder.warm(["Widget", "Safety Barrier System"])
    score = embedder.score("Widget", "Safety Barrier System")
    assert score < 0.5


class _OrthogonalEmbed:
    async def embed(self, texts):
        return [[1.0, 0.0] if i % 2 == 0 else [0.0, 1.0] for i, _ in enumerate(texts)]


@pytest.mark.asyncio
async def test_contained_name_stays_paired_when_cosine_is_low():
    embedder = NameEmbedder(_OrthogonalEmbed())
    await embedder.warm(["NET-RTR-220 Network Edge Router", "Network Edge Router"])
    score = embedder.score("NET-RTR-220 Network Edge Router", "Network Edge Router")
    assert score >= 0.85


@pytest.mark.asyncio
async def test_different_company_names_are_not_saved_by_containment():
    embedder = NameEmbedder(_OrthogonalEmbed())
    await embedder.warm(
        ["Pioneer Industrial Technologies Ltd", "Pioneer Network Services Ltd"]
    )
    score = embedder.score(
        "Pioneer Industrial Technologies Ltd", "Pioneer Network Services Ltd"
    )
    assert score < 0.5


def test_exact_name_skips_vectors():
    embedder = NameEmbedder(None)
    assert embedder.score("Sterling Industrial Ltd.", "sterling industrial ltd") == 1.0
