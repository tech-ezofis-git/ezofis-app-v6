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

/**
 * Native Google sign-in for the web layer (src/social.js expects plugin "EzofisSocialAuth").
 * signIn({ provider: "google" }) -> { email, displayName, idToken }
 *
 * Uses Android Credential Manager ("Sign in with Google"). Requirements in Google Cloud Console,
 * all in the SAME project:
 *   - an Android OAuth client for this app's package name + the SHA-1 of the key that signs the APK
 *   - a Web OAuth client; its id goes in res/values/strings.xml as google_web_client_id
 */
@CapacitorPlugin(name = "EzofisSocialAuth")
public class EzofisSocialAuthPlugin extends Plugin {

    @PluginMethod
    public void signIn(PluginCall call) {
        String provider = call.getString("provider", "google");
        if (!"google".equalsIgnoreCase(provider)) {
            call.reject("Microsoft sign-in is not set up in this build yet.", "UNAVAILABLE");
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
}
