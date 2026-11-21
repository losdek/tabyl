package kg.tabyl.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kg.tabyl.AppState
import kg.tabyl.Route
import kg.tabyl.data.AdDetail
import kg.tabyl.data.NBSP
import kg.tabyl.data.attrText
import kg.tabyl.data.count
import kg.tabyl.data.formatNumber
import kg.tabyl.data.formatPhone
import kg.tabyl.data.lastSeen
import kg.tabyl.data.relativeTime
import kg.tabyl.data.somHint
import kg.tabyl.openUrl
import kg.tabyl.ui.Avatar
import kg.tabyl.ui.Btn
import kg.tabyl.ui.Divider
import kg.tabyl.ui.Empty
import kg.tabyl.ui.Gap
import kg.tabyl.ui.Heart
import kg.tabyl.ui.IconBtn
import kg.tabyl.ui.Icons
import kg.tabyl.ui.Kind
import kg.tabyl.ui.PriceSticker
import kg.tabyl.ui.T
import kg.tabyl.ui.press
import kotlinx.coroutines.launch

private val STATUS = mapOf(
    "pending" to "На проверке у модератора — пока его видите только вы",
    "rejected" to "Отклонено модератором", "sold" to "Продано", "closed" to "Снято с публикации",
)

@Composable
fun AdScreen(app: AppState, id: String) {
    var data by remember { mutableStateOf<AdDetail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var phone by remember { mutableStateOf<String?>(null) }
    var reportOpen by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    suspend fun load() { runCatching { app.api.ad(id) }.onSuccess { data = it; if (it.favorite) app.mergeFavs(listOf(id)) }.onFailure { error = it.message } }
    LaunchedEffect(id) { load() }
    val d = data ?: return Box(Modifier.fillMaxSize()) {
        if (error != null) Empty("Не открылось", error!!, "Назад") { app.back() }
    }
    val ad = d.ad
    val cat = app.meta?.category(ad.category)

    fun withPhone(then: (String) -> Unit) {
        if (!app.requireLogin(Route.Ad(id))) return
        phone?.let(then) ?: scope.launch { runCatching { app.api.phone(id) }.onSuccess { phone = it; then(it) }.onFailure { app.toast = it.message } }
    }

    Column(Modifier.fillMaxSize().background(T.bg)) {
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Box {
                val pager = rememberPagerState { d.photos.size.coerceAtLeast(1) }
                HorizontalPager(pager, Modifier.fillMaxWidth().aspectRatio(4f / 3f).background(T.field)) { i ->
                    d.photos.getOrNull(i)?.let { p ->
                        AsyncImage(app.api.photoUrl(p.id, 1280), if (i == 0) ad.title else null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    } ?: Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Без фото", color = T.mut) }
                }
                Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    IconBtn(Icons.back, "Назад", { app.back() }, bg = T.bg.copy(alpha = .92f))
                    Heart(id in app.favs, { app.toggleFav(ad) }, size = 44.dp, bg = T.bg.copy(alpha = .92f))
                }
                if (d.photos.size > 1) Text(
                    "${pager.currentPage + 1} / ${d.photos.size}", color = Color.White, style = MaterialTheme.typography.labelSmall.copy(color = Color.White),
                    modifier = Modifier.align(Alignment.BottomEnd).padding(end = 12.dp, bottom = 30.dp).clip(RoundedCornerShape(8.dp)).background(Color.Black.copy(alpha = .55f)).padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Column(
                Modifier.offset(y = (-20).dp).clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp)).background(T.bg).padding(horizontal = 16.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                STATUS[ad.status]?.let { Text(it, style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(T.field).padding(10.dp)) }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PriceSticker(ad.price, ad.currency, big = true)
                    somHint(ad.price, ad.currency)?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    if (ad.negotiable && (ad.price ?: 0) > 0) Text("торг", style = MaterialTheme.typography.bodySmall)
                }
                Text(ad.title, style = MaterialTheme.typography.titleLarge)
                Text(
                    "${app.cityName(ad.city)}${if (ad.district.isNotBlank()) ", ${ad.district}" else ""} · ${relativeTime(ad.createdAt)} · ${count(ad.views, "просмотр", "просмотра", "просмотров")}",
                    style = MaterialTheme.typography.bodySmall,
                )
                val specs = buildList {
                    ad.condition?.let { add("Состояние" to if (it == "new") "Новое" else "Б/у") }
                    cat?.attrs?.forEach { a ->
                        val v = ad.attrs.attrText(a.key) ?: return@forEach
                        when (a.kind) {
                            "bool" -> if (v == "true") add(a.label to "Да")
                            "number" -> add(a.label to ((v.toDoubleOrNull()?.let { n -> if (n >= 10000) formatNumber(n.toLong()) else v.removeSuffix(".0").replace('.', ',') } ?: v) + (a.unit?.let { "$NBSP$it" } ?: "")))
                            else -> add(a.label to v)
                        }
                    }
                }
                if (specs.isNotEmpty()) {
                    Divider()
                    specs.chunked(2).forEach { row ->
                        Row(Modifier.fillMaxWidth()) {
                            row.forEach { (k, v) ->
                                Column(Modifier.weight(1f)) {
                                    Text(k, style = MaterialTheme.typography.bodySmall)
                                    Text(v, style = MaterialTheme.typography.bodyLarge)
                                }
                            }
                            if (row.size == 1) Box(Modifier.weight(1f))
                        }
                    }
                    Divider()
                }
                if (ad.description.isNotBlank()) Text(ad.description, style = MaterialTheme.typography.bodyLarge)
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).press({ app.go(Route.Seller(d.seller.id)) }).padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Avatar(d.seller.name, 48.dp)
                    Column(Modifier.weight(1f)) {
                        Text(d.seller.name.ifBlank { "Продавец" }, style = MaterialTheme.typography.titleSmall)
                        Text(
                            (if (d.seller.rating.count > 0) "★$NBSP${d.seller.rating.avg.toString().replace('.', ',')} · ${count(d.seller.rating.count.toLong(), "отзыв", "отзыва", "отзывов")} · " else "") + lastSeen(d.seller.lastSeenAt),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Icon(Icons.next, null, tint = T.mut)
                }
                phone?.let { Text("${formatPhone(it)} — скажите, что нашли на Табыле", style = MaterialTheme.typography.bodyMedium) }
                Text("Не переводите предоплату. Встречайтесь в людных местах и проверяйте товар до оплаты.", style = MaterialTheme.typography.bodySmall)
                if (!d.mine && ad.status == "active") {
                    Text("Пожаловаться", style = MaterialTheme.typography.bodySmall, modifier = Modifier.press({ reportOpen = !reportOpen }).padding(vertical = 8.dp))
                    if (reportOpen) Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Мошенничество", "Товар продан", "Неверная цена", "Запрещённый товар", "Дубликат", "Другое").forEach { reason ->
                            Chip(reason, false) {
                                scope.launch { runCatching { app.api.report("ad", id, reason) }.onSuccess { reportOpen = false; app.toast = "Спасибо, модератор посмотрит" } }
                            }
                        }
                    }
                }
                Gap(8.dp)
            }
        }
        // bottom actions
        Row(
            Modifier.fillMaxWidth().background(T.bg).navigationBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            if (d.mine) {
                if (ad.status == "active") Btn("Продвинуть", { app.go(Route.Promote(id)) }, Modifier.weight(1f), kind = Kind.Sun)
                Btn("Изменить", { app.go(Route.Post(id)) }, Modifier.weight(1f), kind = Kind.Field)
                val next = if (ad.status == "active") "sold" else "active"
                Btn(if (next == "sold") "Продано" else "Вернуть", {
                    scope.launch { runCatching { app.api.setStatus(id, next) }.onSuccess { load() }.onFailure { app.toast = it.message } }
                }, kind = Kind.Field)
            } else if (ad.status == "active") {
                if (d.seller.hasPhone) {
                    IconBtn(Icons.phone, "Позвонить", { withPhone { openUrl("tel:$it") } }, bg = T.field, size = 52.dp)
                    IconBtn(Icons.wa, "Написать в WhatsApp", { withPhone { openUrl("https://wa.me/${it.removePrefix("+")}") } }, bg = T.field, size = 52.dp)
                }
                Btn("Написать", {
                    if (app.requireLogin(Route.Ad(id))) scope.launch {
                        runCatching { app.api.startChat(id) }.onSuccess { app.go(Route.Chat(it)) }.onFailure { app.toast = it.message }
                    }
                }, Modifier.weight(1f).size(52.dp))
            }
        }
    }
}
