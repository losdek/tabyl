package kg.tabyl

import androidx.compose.runtime.Composable
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig

/** Small key-value store for the session token and guest favourites. */
expect object Prefs {
    fun get(key: String): String?
    fun set(key: String, value: String?)
}

expect fun httpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient

/** tel:, https://wa.me/…, payment pages — handed to the system. */
expect fun openUrl(url: String)

/**
 * Pick up to [max] photos from the gallery. Each comes back already shrunk
 * (longest side 1600 px, JPEG, orientation applied) so uploads stay small.
 */
@Composable
expect fun rememberPhotoPicker(max: Int, onPicked: (List<ByteArray>) -> Unit): (Int) -> Unit

@Composable
expect fun BackHandler(enabled: Boolean, onBack: () -> Unit)
