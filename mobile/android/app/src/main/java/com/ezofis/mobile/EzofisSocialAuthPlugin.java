package com.ezofis.mobile;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.microsoft.identity.client.AuthenticationCallback;
import com.microsoft.identity.client.IAccount;
import com.microsoft.identity.client.IAuthenticationResult;
import com.microsoft.identity.client.IPublicClientApplication;
import com.microsoft.identity.client.ISingleAccountPublicClientApplication;
import com.microsoft.identity.client.Prompt;
import com.microsoft.identity.client.PublicClientApplication;
import com.microsoft.identity.client.SignInParameters;
import com.microsoft.identity.client.exception.MsalException;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;

/**
 * Native Google and Microsoft sign-in for the web layer (src/social.js expects plugin "EzofisSocialAuth").
 * signIn({ provider: "google" | "microsoft" }) -> { email, displayName, idToken }
 *
 * Google uses Android Credential Manager ("Sign in with Google"). Requirements in Google Cloud Console,
 * all in the SAME project:
 *   - an Android OAuth client for this app's package name + the SHA-1 of the key that signs the APK
 *   - a Web OAuth client; its id goes in res/values/strings.xml as google_web_client_id
 *
 * Microsoft (Office 365 / Entra ID work accounts) uses MSAL with res/raw/msal_config.json:
 *   - an Azure app registration with an Android platform: package com.ezofis.ezofis_mobile + the signature hash
 *     (base64 SHA-1) of the signing key; its Application (client) id goes in msal_config.json
 *   - the matching BrowserTabActivity redirect in AndroidManifest.xml
 */
@CapacitorPlugin(name = "EzofisSocialAuth")
public class EzofisSocialAuthPlugin extends Plugin {

    private ISingleAccountPublicClientApplication msal;

    @PluginMethod
    public void signIn(PluginCall call) {
        String provider = call.getString("provider", "google");
        if ("microsoft".equalsIgnoreCase(provider)) {
            signInMicrosoft(call);
            return;
        }
        if (!"google".equalsIgnoreCase(provider)) {
            call.reject("Unknown sign-in provider: " + provider, "UNAVAILABLE");
            return;
        }
        String webClientId = getContext().getString(R.string.google_web_client_id).trim();
        if (webClientId.isEmpty()) {
            call.reject("Google sign-in is missing its Web client id (google_web_client_id).", "NOT_CONFIGURED");
            return;
        }

        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(webClientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        CredentialManager manager = CredentialManager.create(getContext());

        manager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    Credential credential = response.getCredential();
                    if (credential instanceof CustomCredential
                        && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        try {
                            GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
                            JSObject ret = new JSObject();
                            ret.put("email", google.getId());           // verified Google account email
                            ret.put("displayName", google.getDisplayName());
                            ret.put("idToken", google.getIdToken());    // for backend verification once supported
                            call.resolve(ret);
                        } catch (Exception e) {
                            call.reject("Couldn't read the Google account.", "FAILED", e);
                        }
                    } else {
                        call.reject("Unexpected credential type.", "FAILED");
                    }
                }

                @Override
                public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) {
                        call.reject("Sign-in was cancelled.", "CANCELLED");
                    } else {
                        call.reject(e.getMessage() != null ? e.getMessage() : "Google sign-in failed.", "FAILED", e);
                    }
                }
            }
        );
    }

    // ---------- Microsoft (MSAL, single-account mode) ----------

    private boolean msalConfigured() {
        // InputStream.readAllBytes() needs API 33, so read in chunks for older phones.
        try (InputStream in = getContext().getResources().openRawResource(R.raw.msal_config)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[1024];
            for (int n; (n = in.read(buf)) != -1; ) out.write(buf, 0, n);
            return !out.toString(StandardCharsets.UTF_8.name()).contains("REPLACE_WITH");
        } catch (Exception e) {
            return false;
        }
    }

    private void signInMicrosoft(PluginCall call) {
        if (!msalConfigured()) {
            call.reject("Microsoft sign-in is missing its Azure client id (res/raw/msal_config.json).", "NOT_CONFIGURED");
            return;
        }
        if (msal != null) {
            startMicrosoftSignIn(call);
            return;
        }
        PublicClientApplication.createSingleAccountPublicClientApplication(
            getContext(),
            R.raw.msal_config,
            new IPublicClientApplication.ISingleAccountApplicationCreatedListener() {
                @Override
                public void onCreated(ISingleAccountPublicClientApplication application) {
                    msal = application;
                    startMicrosoftSignIn(call);
                }

                @Override
                public void onError(MsalException e) {
                    call.reject("Microsoft sign-in isn't set up correctly: " + e.getMessage(), "NOT_CONFIGURED", e);
                }
            }
        );
    }

    // A previous account (single-account mode) is signed out first so the user can pick any work account.
    private void startMicrosoftSignIn(PluginCall call) {
        msal.getCurrentAccountAsync(new ISingleAccountPublicClientApplication.CurrentAccountCallback() {
            @Override
            public void onAccountLoaded(IAccount account) {
                if (account == null) {
                    interactiveMicrosoftSignIn(call);
                    return;
                }
                msal.signOut(new ISingleAccountPublicClientApplication.SignOutCallback() {
                    @Override
                    public void onSignOut() {
                        interactiveMicrosoftSignIn(call);
                    }

                    @Override
                    public void onError(MsalException e) {
                        interactiveMicrosoftSignIn(call);
                    }
                });
            }

            @Override
            public void onAccountChanged(IAccount prior, IAccount current) {
            }

            @Override
            public void onError(MsalException e) {
                interactiveMicrosoftSignIn(call);
            }
        });
    }

    private void interactiveMicrosoftSignIn(PluginCall call) {
        SignInParameters params = SignInParameters.builder()
            .withActivity(getActivity())
            .withScopes(Arrays.asList("User.Read"))
            .withPrompt(Prompt.SELECT_ACCOUNT)
            .withCallback(new AuthenticationCallback() {
                @Override
                public void onSuccess(IAuthenticationResult result) {
                    IAccount account = result.getAccount();
                    Map<String, ?> claims = account.getClaims();
                    String email = claim(claims, "email");
                    if (email.isEmpty()) email = claim(claims, "preferred_username");
                    if (email.isEmpty()) email = account.getUsername() != null ? account.getUsername() : "";
                    if (email.isEmpty()) {
                        call.reject("Microsoft didn't return an email address for this account.", "FAILED");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("email", email);                       // verified work account (UPN / email)
                    ret.put("displayName", claim(claims, "name"));
                    ret.put("idToken", account.getIdToken());      // for backend verification once supported
                    ret.put("tenantId", account.getTenantId());
                    call.resolve(ret);
                }

                @Override
                public void onError(MsalException e) {
                    call.reject(e.getMessage() != null ? e.getMessage() : "Microsoft sign-in failed.", "FAILED", e);
                }

                @Override
                public void onCancel() {
                    call.reject("Sign-in was cancelled.", "CANCELLED");
                }
            })
            .build();
        msal.signIn(params);
    }

    private static String claim(Map<String, ?> claims, String key) {
        Object v = claims != null ? claims.get(key) : null;
        return v != null ? String.valueOf(v).trim() : "";
    }
}
