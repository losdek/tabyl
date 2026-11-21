package kg.tabyl

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.ImageLoader
import coil3.compose.setSingletonImageLoaderFactory
import coil3.network.ktor3.KtorNetworkFetcherFactory
import kg.tabyl.data.Api
import kg.tabyl.data.Card
import kg.tabyl.data.Meta
import kg.tabyl.data.User
import kg.tabyl.screens.AdScreen
import kg.tabyl.screens.ChatScreen
import kg.tabyl.screens.ChatsScreen
import kg.tabyl.screens.FavoritesScreen
import kg.tabyl.screens.HomeScreen
import kg.tabyl.screens.LoginScreen
import kg.tabyl.screens.PostScreen
import kg.tabyl.screens.ProfileScreen
import kg.tabyl.screens.PromoteScreen
import kg.tabyl.screens.SearchScreen
import kg.tabyl.screens.SellerScreen
import kg.tabyl.screens.TestPayScreen
import kg.tabyl.ui.Icons
import kg.tabyl.ui.T
import kg.tabyl.ui.TabylTheme
import kg.tabyl.ui.press
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

sealed interface Route {
    data object Home : Route
    data class Search(val q: String = "", val category: String? = null) : Route
    data class Ad(val id: String) : Route
    data class Login(val next: Route? = null, val register: Boolean = false) : Route
    data class Post(val editId: String? = null) : Route
    data object Favorites : Route
    data object Chats : Route
    data class Chat(val id: String) : Route
    data object Profile : Route
    data class Seller(val id: String) : Route
    data class Promote(val adId: String) : Route
    data class TestPay(val orderId: String, val amount: Long, val tier: String) : Route
}

/** Everything screens share: the API, reference data, the session and favourites. */
class AppState(val api: Api, private val scope: CoroutineScope) {
    var meta by mutableStateOf<Meta?>(null)
    var me by mutableStateOf<User?>(null)
    var unread by mutableStateOf(0)
    var favs by mutableStateOf(Prefs.get("guestFavs")?.split(",")?.filter { it.isNotBlank() }?.toSet() ?: emptySet())
    val stack = mutableStateListOf<Route>(Route.Home)
    var forward by mutableStateOf(true)
    var toast by mutableStateOf<String?>(null)

    val top get() = stack.last()
    val signedIn get() = me != null

    fun go(r: Route) {
        forward = true
        stack.add(r)
    }

    /** Switch tab: the stack restarts at that tab. */
    fun tab(r: Route) {
        forward = true
        stack.clear()
        stack.add(r)
    }

    fun back(): Boolean {
        if (stack.size <= 1) return false
        forward = false
        stack.removeAt(stack.lastIndex)
        return true
    }

    /** Needs an account: go to login and come back afterwards. */
    fun requireLogin(next: Route): Boolean {
        if (signedIn) return true
        go(Route.Login(next))
        return false
    }

    fun photo(id: String) = api.photoUrl(id)
    fun cityName(slug: String) = meta?.cityName(slug) ?: slug

    suspend fun refreshMe() {
        if (api.token == null) return
        runCatching { api.me() }.onSuccess { me = it.user; unread = it.unread }.onFailure { if ((it as? kg.tabyl.data.ApiException)?.status == 401) api.logout() }
    }

    fun mergeFavs(ids: Collection<String>) {
        favs = favs + ids
    }

    /** Favourites work without an account; on sign-in they move into it. */
    fun toggleFav(card: Card) {
        val on = card.id !in favs
        favs = if (on) favs + card.id else favs - card.id
        if (!signedIn) {
            Prefs.set("guestFavs", favs.joinToString(","))
            return
        }
        scope.launch {
            runCatching { api.toggleFavorite(card.id) }.onSuccess { real -> favs = if (real) favs + card.id else favs - card.id }
                .onFailure { favs = if (on) favs - card.id else favs + card.id; toast = "Нет связи — не сохранилось" }
        }
    }

    suspend fun onSignedIn(user: User) {
        me = user
        val guest = Prefs.get("guestFavs")?.split(",")?.filter { it.isNotBlank() } ?: emptyList()
        if (guest.isNotEmpty()) {
            val existing = runCatching { api.favorites().items.map { it.id }.toSet() }.getOrDefault(emptySet())
            guest.filter { it !in existing }.forEach { runCatching { api.toggleFavorite(it) } }
            Prefs.set("guestFavs", null)
        }
        favs = runCatching { api.favorites().items.map { it.id }.toSet() }.getOrDefault(favs)
        refreshMe()
    }

    suspend fun signOut() {
        api.logout()
        me = null
        unread = 0
        favs = emptySet()
        tab(Route.Home)
    }
}

@Composable
fun App(baseUrl: String) {
    setSingletonImageLoaderFactory { ctx -> ImageLoader.Builder(ctx).components { add(KtorNetworkFetcherFactory()) }.build() }
    val scope = rememberCoroutineScope()
    val app = remember { AppState(Api(baseUrl), scope) }
    LaunchedEffect(Unit) {
        launch { runCatching { app.api.meta() }.onSuccess { app.meta = it } }
        app.refreshMe()
        if (app.signedIn) runCatching { app.api.favorites() }.onSuccess { r -> app.favs = r.items.map { it.id }.toSet() }
    }
    BackHandler(enabled = app.stack.size > 1) { app.back() }

    TabylTheme {
        Column(Modifier.fillMaxSize().background(T.page)) {
            Box(Modifier.weight(1f).statusBarsPadding()) {
                AnimatedContent(
                    targetState = app.top,
                    transitionSpec = {
                        val dir = if (app.forward) 1 else -1
                        (slideInHorizontally(tween(260)) { it / 6 * dir } + fadeIn(tween(220))) togetherWith
                            (slideOutHorizontally(tween(260)) { -it / 10 * dir } + fadeOut(tween(160)))
                    },
                    label = "screen",
                ) { r -> Screen(r, app) }
                app.toast?.let { msg ->
                    LaunchedEffect(msg) { kotlinx.coroutines.delay(2600); app.toast = null }
                    Text(
                        msg, color = T.onInk,
                        modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp).clip(RoundedCornerShape(12.dp)).background(T.ink).padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
            }
            val r = app.top
            if (r is Route.Home || r is Route.Favorites || r is Route.Chats || r is Route.Profile || r is Route.Search) TabBar(app)
        }
    }
}

@Composable
private fun Screen(r: Route, app: AppState) {
    when (r) {
        Route.Home -> HomeScreen(app)
        is Route.Search -> SearchScreen(app, r)
        is Route.Ad -> AdScreen(app, r.id)
        is Route.Login -> LoginScreen(app, r)
        is Route.Post -> PostScreen(app, r.editId)
        Route.Favorites -> FavoritesScreen(app)
        Route.Chats -> ChatsScreen(app)
        is Route.Chat -> ChatScreen(app, r.id)
        Route.Profile -> ProfileScreen(app)
        is Route.Seller -> SellerScreen(app, r.id)
        is Route.Promote -> PromoteScreen(app, r.adId)
        is Route.TestPay -> TestPayScreen(app, r)
    }
}

@Composable
private fun TabBar(app: AppState) {
    val top = app.top
    Row(
        Modifier.fillMaxWidth().background(T.bg).border(1.dp, T.line).navigationBarsPadding().padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically,
    ) {
        Tab("Главная", Icons.home, top is Route.Home || top is Route.Search) { app.tab(Route.Home) }
        Tab("Избранное", Icons.heart, top is Route.Favorites) { app.tab(Route.Favorites) }
        Box(Modifier.width(54.dp).height(44.dp).clip(RoundedCornerShape(12.dp)).background(T.sun).press({ if (app.requireLogin(Route.Post())) app.go(Route.Post()) }, "Подать объявление"), contentAlignment = Alignment.Center) {
            Icon(Icons.plus, null, tint = T.onSun)
        }
        Tab("Чаты", Icons.chat, top is Route.Chats, badge = app.unread) { if (app.requireLogin(Route.Chats)) app.tab(Route.Chats) }
        Tab("Профиль", Icons.user, top is Route.Profile) { app.tab(Route.Profile) }
    }
}

@Composable
private fun Tab(label: String, icon: ImageVector, on: Boolean, badge: Int = 0, onClick: () -> Unit) {
    Box {
        Column(Modifier.width(64.dp).height(48.dp).press(onClick, label), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, null, Modifier.size(22.dp), tint = if (on) T.fg else T.mut)
            Text(label, fontSize = 11.sp, color = if (on) T.fg else T.mut, fontWeight = if (on) FontWeight.Medium else FontWeight.Normal)
        }
        if (badge > 0) Text(
            "$badge", fontSize = 10.sp, color = T.onInk,
            modifier = Modifier.align(Alignment.TopEnd).padding(end = 12.dp).clip(CircleShape).background(T.ink).padding(horizontal = 5.dp),
        )
    }
}

@Composable
fun MaterialTitle(text: String) = Text(text, style = MaterialTheme.typography.titleLarge)
