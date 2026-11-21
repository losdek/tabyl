package kg.tabyl.data

import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.timeout
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.prepareGet
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.readUTF8Line
import kg.tabyl.Prefs
import kg.tabyl.httpClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

class ApiException(val status: Int, override val message: String, val fields: Map<String, String> = emptyMap()) : Exception(message)

val json = Json { ignoreUnknownKeys = true; explicitNulls = false; encodeDefaults = true }

/** Client for /api/v1 — the same endpoints the website uses. */
class Api(val baseUrl: String) {
    var token: String? = Prefs.get("token")
        private set

    private val http = httpClient {
        install(ContentNegotiation) { json(json) }
        install(HttpTimeout) { requestTimeoutMillis = 20_000; connectTimeoutMillis = 8_000 }
        expectSuccess = false
        defaultRequest { url("$baseUrl/") }
    }

    private fun HttpRequestBuilder.auth() {
        token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
    }

    private suspend inline fun <reified T> HttpResponse.ok(): T {
        if (!status.isSuccess()) {
            val e = runCatching { body<ApiErrorBody>() }.getOrNull()
            throw ApiException(status.value, e?.error ?: "Нет связи с сервером", e?.fields ?: emptyMap())
        }
        return body()
    }

    private suspend inline fun <reified T> get(path: String, crossinline params: HttpRequestBuilder.() -> Unit = {}): T =
        http.get("api/v1/$path") { auth(); params() }.ok()

    private suspend inline fun <reified T> post(path: String, data: JsonObject = JsonObject(emptyMap())): T =
        http.post("api/v1/$path") { auth(); contentType(ContentType.Application.Json); setBody(data) }.ok()

    fun photoUrl(id: String, w: Int = 640) = "$baseUrl/media/p/$id/$w.webp"

    /* ---- auth ---- */
    suspend fun requestCode(phone: String) = post<JsonObject>("auth/code", buildJsonObject { put("phone", phone) })
    suspend fun verify(phone: String, code: String): User {
        val r = post<AuthOk>("auth/verify", buildJsonObject { put("phone", phone); put("code", code) })
        token = r.token
        Prefs.set("token", r.token)
        return r.user
    }
    suspend fun logout() {
        runCatching { post<JsonObject>("auth/logout") }
        token = null
        Prefs.set("token", null)
    }

    /* ---- data ---- */
    suspend fun meta(): Meta = get("meta")
    suspend fun me(): Me = get("me")
    suspend fun updateMe(name: String, city: String): JsonObject =
        http.patch("api/v1/me") { auth(); contentType(ContentType.Application.Json); setBody(buildJsonObject { put("name", name); put("city", city) }) }.ok()
    suspend fun myAds(): Items = get("me/ads")

    suspend fun ads(params: Map<String, String>, cursor: String? = null): AdsPage = get("ads") {
        params.forEach { (k, v) -> if (v.isNotBlank()) parameter(k, v) }
        cursor?.let { parameter("cursor", it) }
    }
    suspend fun suggest(q: String): Suggest = get("suggest") { parameter("q", q) }
    suspend fun ad(id: String): AdDetail = get("ads/$id")
    suspend fun createAd(input: JsonObject): Created = post("ads", input)
    suspend fun updateAd(id: String, input: JsonObject): JsonObject =
        http.put("api/v1/ads/$id") { auth(); contentType(ContentType.Application.Json); setBody(input) }.ok()
    suspend fun setStatus(id: String, status: String): JsonObject = post("ads/$id/status", buildJsonObject { put("status", status) })
    suspend fun toggleFavorite(id: String): Boolean = post<FavOn>("ads/$id/favorite").on
    suspend fun favorites(): Items = get("favorites")
    suspend fun phone(id: String): String = post<PhoneNo>("ads/$id/phone").phone
    suspend fun startChat(id: String): String = post<ConvId>("ads/$id/chat").conversationId

    suspend fun chats(): Chats = get("chats")
    suspend fun thread(id: String): Thread = get("chats/$id")
    suspend fun send(id: String, body: JsonObject): Msg = post("chats/$id/messages", body)
    suspend fun markRead(id: String): JsonObject = post("chats/$id/read")

    suspend fun user(id: String): UserPage = get("users/$id")
    suspend fun review(sellerId: String, rating: Int, text: String): JsonObject =
        post("users/$sellerId/reviews", buildJsonObject { put("rating", rating); put("text", text) })
    suspend fun report(type: String, id: String, reason: String): JsonObject =
        post("reports", buildJsonObject { put("targetType", type); put("targetId", id); put("reason", reason) })

    suspend fun promote(adId: String, tier: String): Promo = post("ads/$adId/promote", buildJsonObject { put("tier", tier) })
    suspend fun testPay(orderId: String, ok: Boolean): OrderStatus = post("orders/$orderId/test-pay", buildJsonObject { put("ok", ok) })
    suspend fun order(orderId: String): OrderStatus = get("orders/$orderId")

    suspend fun upload(bytes: ByteArray): Photo = http.submitFormWithBinaryData(
        url = "api/upload",
        formData = formData {
            append("file", bytes, Headers.build {
                append(HttpHeaders.ContentType, "image/jpeg")
                append(HttpHeaders.ContentDisposition, "filename=\"photo.jpg\"")
            })
        },
    ) { auth() }.ok()

    /** Live chat events (Server-Sent Events): new messages and read receipts. */
    fun events(conversationId: String): Flow<JsonObject> = flow {
        http.prepareGet("api/chat/$conversationId/stream") {
            auth()
            header(HttpHeaders.Accept, "text/event-stream")
            timeout { requestTimeoutMillis = Long.MAX_VALUE }
        }.execute { resp ->
            val ch = resp.bodyAsChannel()
            while (!ch.isClosedForRead) {
                val line = ch.readUTF8Line() ?: break
                if (line.startsWith("data: ")) emit(json.parseToJsonElement(line.removePrefix("data: ")).jsonObject)
            }
        }
    }
}

fun JsonObject.str(key: String) = (this[key] as? JsonPrimitive)?.content
fun JsonObject.attrText(key: String) = this[key]?.jsonPrimitive?.content
