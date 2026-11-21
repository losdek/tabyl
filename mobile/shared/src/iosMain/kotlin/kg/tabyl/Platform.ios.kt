package kg.tabyl

import androidx.compose.runtime.Composable
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.darwin.Darwin
import platform.Foundation.NSURL
import platform.Foundation.NSUserDefaults
import platform.UIKit.UIApplication

// iOS is built on a Mac later; these are complete enough to compile there.
actual object Prefs {
    actual fun get(key: String): String? = NSUserDefaults.standardUserDefaults.stringForKey("tabyl.$key")
    actual fun set(key: String, value: String?) {
        if (value == null) NSUserDefaults.standardUserDefaults.removeObjectForKey("tabyl.$key")
        else NSUserDefaults.standardUserDefaults.setObject(value, "tabyl.$key")
    }
}

actual fun httpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient = HttpClient(Darwin, config)

actual fun openUrl(url: String) {
    NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.openURL(it, emptyMap<Any?, Any>(), null) }
}

@Composable
actual fun rememberPhotoPicker(max: Int, onPicked: (List<ByteArray>) -> Unit): (Int) -> Unit = { _ -> } // PHPicker: to do on Mac

@Composable
actual fun BackHandler(enabled: Boolean, onBack: () -> Unit) {}
