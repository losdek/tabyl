package kg.tabyl

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.exifinterface.media.ExifInterface
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.okhttp.OkHttp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

/** Set once from MainActivity. */
@SuppressLint("StaticFieldLeak")
object AndroidPlatform {
    lateinit var context: Context
}

actual object Prefs {
    private val p by lazy { AndroidPlatform.context.getSharedPreferences("tabyl", Context.MODE_PRIVATE) }
    actual fun get(key: String): String? = p.getString(key, null)
    actual fun set(key: String, value: String?) {
        p.edit().apply { if (value == null) remove(key) else putString(key, value) }.apply()
    }
}

actual fun httpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient = HttpClient(OkHttp, config)

actual fun openUrl(url: String) {
    val ctx = AndroidPlatform.context
    if (url.startsWith("http")) {
        CustomTabsIntent.Builder().build().apply { intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }.launchUrl(ctx, Uri.parse(url))
    } else {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

/** Shrink before upload: longest side ≤ 1600 px, EXIF rotation applied, JPEG 85. */
private fun shrink(ctx: Context, uri: Uri): ByteArray? = runCatching {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    ctx.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= 1600) sample *= 2
    val bmp = ctx.contentResolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null
    val rotation = ctx.contentResolver.openInputStream(uri)?.use {
        when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
    } ?: 0f
    val scale = minOf(1f, 1600f / maxOf(bmp.width, bmp.height))
    val m = Matrix().apply { postRotate(rotation); postScale(scale, scale) }
    val out = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
    ByteArrayOutputStream().use { s -> out.compress(Bitmap.CompressFormat.JPEG, 85, s); s.toByteArray() }
}.getOrNull()

@Composable
actual fun rememberPhotoPicker(max: Int, onPicked: (List<ByteArray>) -> Unit): (Int) -> Unit {
    val scope = rememberCoroutineScope()
    val many = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(maxOf(2, max))) { uris ->
        scope.launch {
            val bytes = withContext(Dispatchers.IO) { uris.take(max).mapNotNull { shrink(AndroidPlatform.context, it) } }
            if (bytes.isNotEmpty()) onPicked(bytes)
        }
    }
    val one = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            val b = withContext(Dispatchers.IO) { shrink(AndroidPlatform.context, uri) }
            if (b != null) onPicked(listOf(b))
        }
    }
    val req = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
    return remember { { n: Int -> if (n <= 1) one.launch(req) else many.launch(req) } }
}

@Composable
actual fun BackHandler(enabled: Boolean, onBack: () -> Unit) = androidx.activity.compose.BackHandler(enabled, onBack)
