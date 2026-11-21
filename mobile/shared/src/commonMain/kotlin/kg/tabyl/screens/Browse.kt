package kg.tabyl.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kg.tabyl.AppState
import kg.tabyl.Prefs
import kg.tabyl.Route
import kg.tabyl.data.Card
import kg.tabyl.data.count
import kg.tabyl.data.memberSince
import kg.tabyl.data.relativeTime
import kg.tabyl.ui.Avatar
import kg.tabyl.ui.Btn
import kg.tabyl.ui.CategoryPill
import kg.tabyl.ui.Divider
import kg.tabyl.ui.Empty
import kg.tabyl.ui.Feed
import kg.tabyl.ui.Field
import kg.tabyl.ui.Gap
import kg.tabyl.ui.Icons
import kg.tabyl.ui.Island
import kg.tabyl.ui.Kind
import kg.tabyl.ui.T
import kg.tabyl.ui.TopBar
import kg.tabyl.ui.logo
import kg.tabyl.ui.press
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

/** Paged feed state shared by home and search. */
class Paged {
    val items = mutableStateListOf<Card>()
    var cursor by mutableStateOf<String?>(null)
    var loading by mutableStateOf(false)
    var done by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    suspend fun load(app: AppState, params: Map<String, String>, reset: Boolean) {
        if (loading || (!reset && done)) return
        loading = true
        error = null
        runCatching { app.api.ads(params, if (reset) null else cursor) }
            .onSuccess { p ->
                if (reset) items.clear()
                val seen = items.map { it.id }.toSet()
                items.addAll(p.items.filter { it.id !in seen })
                cursor = p.nextCursor
                done = p.nextCursor == null
                app.mergeFavs(p.favorites)
            }
            .onFailure { error = it.message ?: "Нет связи" }
        loading = false
    }
}

@Composable
private fun HeaderBar(app: AppState, onSearch: () -> Unit) {
    Island(Modifier.fillMaxWidth().padding(top = 8.dp), PaddingValues(horizontal = 14.dp, vertical = 10.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(logo(T.fg), "Табыл", Modifier.height(24.dp).width(96.dp), tint = androidx.compose.ui.graphics.Color.Unspecified)
            Row(
                Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp)).background(T.field).press(onSearch, "Поиск по объявлениям").padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.search, null, tint = T.fg)
                Text("Что ищете?", color = T.mut, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Icon(Icons.filter, null, tint = T.fg)
            }
        }
    }
}

@Composable
fun HomeScreen(app: AppState) {
    val feed = remember { Paged() }
    val scope = rememberCoroutineScope()
    val city = Prefs.get("city") ?: app.me?.city ?: "bishkek"
    val params = mapOf("city" to city)
    LaunchedEffect(city) { feed.load(app, params, reset = true) }
    Feed(
        items = feed.items, favs = app.favs, photoUrl = app::photo, cityName = app::cityName,
        onOpen = { app.go(Route.Ad(it.id)) }, onFav = app::toggleFav,
        onMore = { scope.launch { feed.load(app, params, reset = false) } },
        modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 12.dp),
        header = {
            item(span = StaggeredGridItemSpan.FullLine) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    HeaderBar(app) { app.go(Route.Search()) }
                    Island(Modifier.fillMaxWidth()) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Box(Modifier.size(64.dp).clip(CircleShape).background(T.sun), contentAlignment = Alignment.Center) {
                                Icon(Icons.shield, null, Modifier.size(34.dp), tint = T.onSun)
                            }
                            Text("Без предоплаты", style = MaterialTheme.typography.titleLarge)
                            Text("Встречайтесь в людных местах и проверяйте товар до оплаты. Мы не присылаем ссылки на оплату.", style = MaterialTheme.typography.bodyMedium.copy(color = T.mut))
                        }
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        item {
                            Island(Modifier.width(290.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Продайте за минуту", style = MaterialTheme.typography.titleMedium)
                                    Text("Фото, цена и пара слов — объявление сразу в ленте. Бесплатно.", style = MaterialTheme.typography.bodySmall)
                                    Btn("Подать объявление", { if (app.requireLogin(Route.Post())) app.go(Route.Post()) }, kind = Kind.Sun, icon = Icons.plus)
                                }
                            }
                        }
                        item {
                            Island(Modifier.width(290.dp)) {
                                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    if (app.signedIn) {
                                        Text("Здравствуйте${app.me?.name?.takeIf { it.isNotBlank() }?.let { ", $it" } ?: ""}", style = MaterialTheme.typography.titleMedium)
                                        Text("Ваши объявления, сохранённые поиски и настройки — в профиле.", style = MaterialTheme.typography.bodySmall)
                                        Btn("Открыть профиль", { app.tab(Route.Profile) }, kind = Kind.Field)
                                    } else {
                                        Text("Войдите по номеру", style = MaterialTheme.typography.titleMedium)
                                        Text("Писать продавцам и видеть избранное на любом устройстве.", style = MaterialTheme.typography.bodySmall)
                                        Btn("Войти или зарегистрироваться", { app.go(Route.Login(register = true)) })
                                    }
                                }
                            }
                        }
                    }
                    Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Новые ${app.meta?.cities?.firstOrNull { it.slug == city }?.`in` ?: ""}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        Text("Все", style = MaterialTheme.typography.labelLarge, modifier = Modifier.clip(CircleShape).background(T.bg).press({ app.go(Route.Search()) }).padding(horizontal = 14.dp, vertical = 8.dp))
                    }
                    feed.error?.let { Empty("Нет связи", it, "Повторить") { scope.launch { feed.load(app, params, reset = true) } } }
                }
            }
        },
    )
}

@OptIn(FlowPreview::class, ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(app: AppState, r: Route.Search) {
    var q by remember { mutableStateOf(r.q) }
    var cat by remember { mutableStateOf(r.category) }
    var city by remember { mutableStateOf(Prefs.get("city") ?: app.me?.city ?: "bishkek") }
    var pmin by remember { mutableStateOf("") }
    var pmax by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf("new") }
    var sheet by remember { mutableStateOf(false) }
    val feed = remember { Paged() }
    val scope = rememberCoroutineScope()
    val focus = remember { FocusRequester() }
    fun params() = buildMap {
        if (q.isNotBlank()) put("q", q.trim())
        put("city", city)
        cat?.let { put("cat", it) }
        if (pmin.isNotBlank()) put("pmin", pmin)
        if (pmax.isNotBlank()) put("pmax", pmax)
        if (sort != "new") put("sort", sort)
    }
    // results follow the query as you type
    LaunchedEffect(Unit) {
        snapshotFlow { params() }.debounce(180).collect { feed.load(app, it, reset = true) }
    }
    LaunchedEffect(Unit) { if (r.q.isEmpty() && r.category == null) focus.requestFocus() }

    Column(Modifier.fillMaxSize()) {
        Island(Modifier.fillMaxWidth().padding(8.dp), PaddingValues(horizontal = 6.dp, vertical = 6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                kg.tabyl.ui.IconBtn(Icons.back, "Назад", { if (!app.back()) app.tab(kg.tabyl.Route.Home) })
                Row(Modifier.weight(1f).height(48.dp).clip(RoundedCornerShape(12.dp)).background(T.field).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.search, null, tint = if (feed.loading) T.mut else T.fg)
                    BasicTextField(
                        q, { q = it }, singleLine = true, textStyle = MaterialTheme.typography.bodyLarge.copy(color = T.fg),
                        modifier = Modifier.weight(1f).padding(horizontal = 10.dp).focusRequester(focus).semantics { contentDescription = "Поиск по объявлениям" },
                        decorationBox = { inner -> Box { if (q.isEmpty()) Text("Что ищете?", color = T.mut, style = MaterialTheme.typography.bodyLarge); inner() } },
                    )
                    if (q.isNotEmpty()) kg.tabyl.ui.IconBtn(Icons.close, "Очистить", { q = "" }, size = 36.dp)
                }
                kg.tabyl.ui.IconBtn(Icons.filter, "Фильтры", { sheet = true })
            }
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(app.meta?.categories ?: emptyList(), key = { it.slug }) { c ->
                CategoryPill(c.name, Icons.category(c.slug), c.slug == cat) { cat = if (cat == c.slug) null else c.slug }
            }
        }
        if (feed.items.isEmpty() && !feed.loading) {
            Empty("Ничего не нашлось", "Попробуйте другие слова или уберите фильтры", if (city != "all") "Искать по всей стране" else null) { city = "all" }
        }
        Feed(
            items = feed.items, favs = app.favs, photoUrl = app::photo, cityName = app::cityName,
            onOpen = { app.go(Route.Ad(it.id)) }, onFav = app::toggleFav,
            onMore = { scope.launch { feed.load(app, params(), reset = false) } }, modifier = Modifier.weight(1f),
        )
    }

    if (sheet) ModalBottomSheet(onDismissRequest = { sheet = false }, containerColor = T.bg) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Фильтры", style = MaterialTheme.typography.titleMedium)
            Text("Город", style = MaterialTheme.typography.bodySmall)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Chip("Весь Кыргызстан", city == "all") { city = "all" } }
                items(app.meta?.cities ?: emptyList()) { c -> Chip(c.name, city == c.slug) { city = c.slug; Prefs.set("city", c.slug) } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Field(pmin, { pmin = it.filter(Char::isDigit) }, "Цена от", Modifier.weight(1f), keyboard = androidx.compose.ui.text.input.KeyboardType.Number)
                Field(pmax, { pmax = it.filter(Char::isDigit) }, "до", Modifier.weight(1f), keyboard = androidx.compose.ui.text.input.KeyboardType.Number)
            }
            Text("Сортировка", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("Новые", sort == "new") { sort = "new" }
                Chip("Дешевле", sort == "cheap") { sort = "cheap" }
                Chip("Дороже", sort == "expensive") { sort = "expensive" }
            }
            Btn("Показать", { sheet = false }, Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun Chip(text: String, on: Boolean, onClick: () -> Unit) {
    Text(
        text, color = if (on) T.onInk else T.fg, style = MaterialTheme.typography.bodyMedium,
        modifier = Modifier.heightIn(min = 40.dp).clip(CircleShape).background(if (on) T.ink else T.field).press(onClick).padding(horizontal = 14.dp, vertical = 10.dp),
    )
}

@Composable
fun FavoritesScreen(app: AppState) {
    val items = remember { mutableStateListOf<Card>() }
    var loaded by remember { mutableStateOf(false) }
    LaunchedEffect(app.signedIn) {
        items.clear()
        if (app.signedIn) runCatching { app.api.favorites() }.onSuccess { items.addAll(it.items) }
        else app.favs.forEach { id -> runCatching { app.api.ad(id) }.onSuccess { items.add(it.ad.copy(photo = it.photos.firstOrNull())) } }
        loaded = true
    }
    val shown = items.filter { it.id in app.favs }
    Column(Modifier.fillMaxSize()) {
        Island(Modifier.fillMaxWidth().padding(8.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Избранное", style = MaterialTheme.typography.titleLarge)
                if (!app.signedIn && shown.isNotEmpty()) Text("Сохранено на этом телефоне. Войдите, чтобы избранное было на всех устройствах.", style = MaterialTheme.typography.bodySmall)
            }
        }
        if (loaded && shown.isEmpty()) Empty("Пока пусто", "Нажмите на сердечко у объявления, и оно появится здесь", "К объявлениям") { app.tab(Route.Home) }
        Feed(shown, app.favs, app::photo, app::cityName, { app.go(Route.Ad(it.id)) }, app::toggleFav, null, Modifier.weight(1f))
    }
}

@Composable
fun SellerScreen(app: AppState, id: String) {
    var page by remember { mutableStateOf<kg.tabyl.data.UserPage?>(null) }
    var stars by remember { mutableStateOf(0) }
    var text by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(id) { page = runCatching { app.api.user(id) }.getOrNull() }
    val p = page
    Column(Modifier.fillMaxSize()) {
        TopBar(p?.user?.name?.ifBlank { "Продавец" } ?: "", { app.back() })
        if (p == null) return@Column
        Feed(
            p.items, app.favs, app::photo, app::cityName, { app.go(Route.Ad(it.id)) }, app::toggleFav, null, Modifier.weight(1f),
            header = {
                item(span = StaggeredGridItemSpan.FullLine) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Island(Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Avatar(p.user.name, 60.dp)
                                Column {
                                    Text(p.user.name.ifBlank { "Продавец" }, style = MaterialTheme.typography.titleLarge)
                                    Text(
                                        (if (p.rating.count > 0) "★ ${p.rating.avg.toString().replace('.', ',')} · ${count(p.rating.count.toLong(), "отзыв", "отзыва", "отзывов")}" else "Пока без отзывов") + " · ${app.cityName(p.user.city)}",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    Text(memberSince(p.user.createdAt), style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                        if (p.canReview && !sent) Island(Modifier.fillMaxWidth()) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("Как прошла сделка?", style = MaterialTheme.typography.titleSmall)
                                Row { (1..5).forEach { n -> Text(if (n <= stars) "★" else "☆", style = MaterialTheme.typography.titleLarge, modifier = Modifier.size(44.dp).press({ stars = n }, "$n из 5").padding(8.dp)) } }
                                Field(text, { text = it }, "", placeholder = "Что понравилось или нет (необязательно)", lines = 3)
                                ErrorText(err)
                                Btn("Оставить отзыв", {
                                    scope.launch { runCatching { app.api.review(id, stars, text) }.onSuccess { sent = true; app.toast = "Спасибо за отзыв" }.onFailure { err = it.message } }
                                }, enabled = stars > 0)
                            }
                        }
                        if (p.reviews.isNotEmpty()) Island(Modifier.fillMaxWidth()) {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Отзывы", style = MaterialTheme.typography.titleMedium)
                                p.reviews.forEach { rv ->
                                    Column {
                                        Text("${"★".repeat(rv.rating)}${"☆".repeat(5 - rv.rating)}  ${rv.author.name.ifBlank { "Покупатель" }} · ${relativeTime(rv.createdAt)}", style = MaterialTheme.typography.bodySmall)
                                        if (rv.text.isNotBlank()) Text(rv.text, style = MaterialTheme.typography.bodyMedium)
                                        rv.reply?.let { Text("Ответ продавца: $it", style = MaterialTheme.typography.bodySmall) }
                                    }
                                    Divider()
                                }
                            }
                        }
                        Text(count(p.items.size.toLong(), "объявление", "объявления", "объявлений"), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(4.dp))
                        Gap(2.dp)
                    }
                }
            },
        )
    }
}

@Composable
fun ErrorText(text: String?) = kg.tabyl.ui.ErrorLine(text)
