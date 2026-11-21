package kg.tabyl.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/** Shapes of /api/v1 responses (see docs/api.md). */

@Serializable data class Photo(val id: String, val width: Int = 0, val height: Int = 0, val blur: String = "")

@Serializable
data class Card(
    val id: String,
    val userId: String,
    val category: String,
    val title: String,
    val description: String = "",
    val price: Long? = null,
    val currency: String = "KGS",
    val negotiable: Boolean = false,
    val condition: String? = null,
    val city: String,
    val district: String = "",
    val attrs: JsonObject = JsonObject(emptyMap()),
    val status: String = "active",
    val views: Long = 0,
    val createdAt: String,
    val bumpedAt: String,
    val promotedUntil: String? = null,
    val photo: Photo? = null,
    val promoted: Boolean = false,
)

@Serializable data class AdsPage(val items: List<Card>, val nextCursor: String? = null, val favorites: List<String> = emptyList())
@Serializable data class Items(val items: List<Card>)

@Serializable data class Rating(val avg: Double? = null, val count: Int = 0)
@Serializable data class PublicUser(val id: String, val name: String = "", val city: String = "bishkek", val createdAt: String, val lastSeenAt: String)
@Serializable
data class Seller(
    val id: String, val name: String = "", val city: String = "", val createdAt: String, val lastSeenAt: String,
    val hasPhone: Boolean = false, val rating: Rating = Rating(),
)
@Serializable
data class AdDetail(val ad: Card, val photos: List<Photo>, val seller: Seller, val favorite: Boolean = false, val mine: Boolean = false)

@Serializable
data class AttrDef(
    val key: String, val label: String, val kind: String, val options: List<String>? = null, val unit: String? = null,
    val min: Double? = null, val max: Double? = null, val filter: Boolean? = null, val required: Boolean? = null,
    val placeholder: String? = null,
)
@Serializable
data class Category(val slug: String, val name: String, val condition: Boolean, val priceLabel: String, val currency: String, val attrs: List<AttrDef>)
@Serializable data class City(val slug: String, val name: String, val `in`: String)
@Serializable data class Tier(val name: String, val note: String, val price: Long, val days: Int)
@Serializable
data class Meta(val categories: List<Category>, val cities: List<City>, val tiers: Map<String, Tier>, val payments: String) {
    fun category(slug: String?) = categories.firstOrNull { it.slug == slug }
    fun cityName(slug: String) = cities.firstOrNull { it.slug == slug }?.name ?: slug
}

@Serializable
data class User(
    val id: String, val name: String = "", val city: String = "bishkek", val createdAt: String, val lastSeenAt: String,
    val phone: String? = null, val email: String? = null, val role: String = "user",
)
@Serializable data class Me(val user: User, val unread: Int = 0, val rating: Rating = Rating())
@Serializable data class AuthOk(val token: String, val user: User)

@Serializable data class ChatAd(val id: String, val title: String, val price: Long? = null, val currency: String = "KGS", val status: String = "active", val city: String = "")
@Serializable data class PhotoRef(val id: String, val blur: String = "")
@Serializable data class Last(val kind: String, val body: String, val senderId: String, val createdAt: String)
@Serializable
data class ChatItem(val id: String, val role: String, val unread: Int, val other: PublicUser, val ad: ChatAd, val photo: PhotoRef? = null, val last: Last)
@Serializable data class Chats(val items: List<ChatItem>)
@Serializable
data class Msg(
    val id: String, val conversationId: String, val senderId: String, val kind: String, val body: String,
    val payload: JsonObject? = null, val createdAt: String, val readAt: String? = null,
)
@Serializable
data class Thread(
    val id: String, val other: PublicUser, val blocked: Boolean = false, val ad: ChatAd? = null, val photo: PhotoRef? = null,
    val canReview: Boolean = false, val messages: List<Msg>,
)

@Serializable data class Author(val id: String, val name: String = "")
@Serializable data class Review(val id: String, val rating: Int, val text: String = "", val reply: String? = null, val createdAt: String, val author: Author)
@Serializable
data class UserPage(val user: PublicUser, val rating: Rating, val items: List<Card>, val canReview: Boolean = false, val reviews: List<Review>)

@Serializable data class Promo(val orderId: String, val provider: String, val amount: Long, val paymentUrl: String? = null)
@Serializable data class OrderStatus(val status: String)
@Serializable data class Created(val id: String, val status: String = "active")
@Serializable data class ConvId(val conversationId: String)
@Serializable data class PhoneNo(val phone: String)
@Serializable data class FavOn(val on: Boolean)
@Serializable data class Suggest(val categories: List<SuggestCat> = emptyList(), val titles: List<String> = emptyList())
@Serializable data class SuggestCat(val slug: String, val name: String)
@Serializable data class ApiErrorBody(val error: String = "Ошибка", val fields: Map<String, String>? = null)
