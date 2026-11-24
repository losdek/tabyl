package kg.tabyl.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kg.tabyl.AppState
import kg.tabyl.Route
import kg.tabyl.data.ChatItem
import kg.tabyl.data.Msg
import kg.tabyl.data.Thread
import kg.tabyl.data.clockTime
import kg.tabyl.data.formatPrice
import kg.tabyl.data.json
import kg.tabyl.data.lastSeen
import kg.tabyl.data.relativeTime
import kg.tabyl.data.str
import kg.tabyl.openUrl
import kg.tabyl.ui.Avatar
import kg.tabyl.ui.Divider
import kg.tabyl.ui.Empty
import kg.tabyl.ui.Field
import kg.tabyl.ui.IconBtn
import kg.tabyl.ui.Icons
import kg.tabyl.ui.Island
import kg.tabyl.ui.T
import kg.tabyl.ui.press
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put

@Composable
fun ChatsScreen(app: AppState) {
    var list by remember { mutableStateOf<List<ChatItem>?>(null) }
    LaunchedEffect(Unit) { list = runCatching { app.api.chats().items }.getOrDefault(emptyList()); app.refreshMe() }
    Column(Modifier.fillMaxSize().padding(8.dp)) {
        Island(Modifier.fillMaxWidth()) {
            Column {
                Text("Чаты", style = MaterialTheme.typography.titleLarge)
                val l = list
                if (l != null && l.isEmpty()) Empty("Пока нет переписок", "Здесь будут чаты с продавцами и покупателями")
                LazyColumn {
                    items(l ?: emptyList(), key = { it.id }) { c ->
                        Row(Modifier.fillMaxWidth().press({ app.go(Route.Chat(c.id)) }).padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)).background(T.field)) {
                                c.photo?.let { AsyncImage(app.api.photoUrl(it.id, 320), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
                            }
                            Column(Modifier.weight(1f)) {
                                Row {
                                    Text(c.other.name.ifBlank { if (c.role == "seller") "Покупатель" else "Продавец" }, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f), maxLines = 1)
                                    Text(relativeTime(c.last.createdAt), style = MaterialTheme.typography.bodySmall)
                                }
                                Text("${c.ad.title} · ${formatPrice(c.ad.price, c.ad.currency)}", style = MaterialTheme.typography.bodySmall, maxLines = 1)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    val prefix = if (c.last.senderId == app.me?.id) "Вы: " else ""
                                    val body = when (c.last.kind) { "photo" -> "Фото"; "place" -> "Адрес: ${c.last.body}"; else -> c.last.body }
                                    Text(prefix + body, style = MaterialTheme.typography.bodySmall.copy(color = if (c.unread > 0) T.fg else T.mut, fontWeight = if (c.unread > 0) FontWeight.Medium else FontWeight.Normal), maxLines = 1, modifier = Modifier.weight(1f))
                                    if (c.unread > 0) Text("${c.unread}", style = MaterialTheme.typography.labelSmall.copy(color = T.onInk), modifier = Modifier.clip(CircleShape).background(T.ink).padding(horizontal = 7.dp, vertical = 1.dp))
                                }
                            }
                        }
                        Divider()
                    }
                }
            }
        }
    }
}

@Composable
fun ChatScreen(app: AppState, id: String) {
    var thread by remember { mutableStateOf<Thread?>(null) }
    val msgs = remember { mutableStateListOf<Msg>() }
    val fresh = remember { mutableStateListOf<String>() }
    var text by remember { mutableStateOf("") }
    var placeOpen by remember { mutableStateOf(false) }
    var address by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val me = app.me?.id

    LaunchedEffect(id) {
        runCatching { app.api.thread(id) }.onSuccess { thread = it; msgs.clear(); msgs.addAll(it.messages) }
        // live updates; reconnects if the stream drops
        while (true) {
            runCatching {
                app.api.events(id).collect { e ->
                    when (e.str("type")) {
                        "message" -> {
                            val m = json.decodeFromJsonElement<Msg>(e["message"]!!.jsonObject)
                            if (msgs.none { it.id == m.id }) { fresh.add(m.id); msgs.add(m) }
                            if (m.senderId != me) runCatching { app.api.markRead(id) }
                        }
                        "read" -> if (e.str("by") != me) {
                            val at = e.str("at")
                            msgs.replaceAll { if (it.senderId == me && it.readAt == null) it.copy(readAt = at) else it }
                        }
                    }
                }
            }
            kotlinx.coroutines.delay(2000)
        }
    }
    LaunchedEffect(msgs.size) { if (msgs.isNotEmpty()) listState.animateScrollToItem(msgs.size) }

    fun send(body: kotlinx.serialization.json.JsonObject, after: () -> Unit = {}) = scope.launch {
        runCatching { app.api.send(id, body) }.onSuccess { m -> if (msgs.none { it.id == m.id }) { fresh.add(m.id); msgs.add(m) }; after() }
            .onFailure { app.toast = it.message }
    }

    val t = thread
    Column(Modifier.fillMaxSize().background(T.bg).imePadding()) {
        Row(Modifier.fillMaxWidth().padding(4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            IconBtn(Icons.back, "Все чаты", { app.back() })
            if (t != null) {
                Avatar(t.other.name, 38.dp)
                Column(Modifier.weight(1f).press({ app.go(Route.Seller(t.other.id)) })) {
                    Text(t.other.name.ifBlank { "Собеседник" }, style = MaterialTheme.typography.titleSmall)
                    Text(lastSeen(t.other.lastSeenAt), style = MaterialTheme.typography.bodySmall)
                }
                if (t.canReview) Text("Отзыв", style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.press({ app.go(Route.Seller(t.other.id)) }).padding(8.dp))
            }
        }
        t?.ad?.let { ad ->
            Divider()
            Row(Modifier.fillMaxWidth().press({ app.go(Route.Ad(ad.id)) }).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(32.dp).clip(RoundedCornerShape(6.dp)).background(T.field)) {
                    t.photo?.let { AsyncImage(app.api.photoUrl(it.id, 320), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop) }
                }
                Text(ad.title, style = MaterialTheme.typography.bodySmall.copy(color = T.fg), maxLines = 1, modifier = Modifier.weight(1f))
                Text(formatPrice(ad.price, ad.currency), style = MaterialTheme.typography.labelMedium)
            }
            Divider()
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), state = listState, contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            item {
                Text("Мы никогда не просим предоплату и не присылаем ссылки на оплату", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 40.dp, vertical = 8.dp))
            }
            items(msgs, key = { it.id }) { m ->
                val mine = m.senderId == me
                val lastOfGroup = msgs.getOrNull(msgs.indexOf(m) + 1)?.senderId != m.senderId
                AnimatedVisibility(visible = true, enter = if (m.id in fresh) fadeIn() + scaleIn(initialScale = .96f) else fadeIn(initialAlpha = 1f)) {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
                        Bubble(app, m, mine, t?.ad?.city ?: "")
                        if (lastOfGroup) Text(
                            clockTime(m.createdAt) + if (mine && m.id == msgs.lastOrNull { it.senderId == me }?.id) (if (m.readAt != null) " · прочитано" else " · отправлено") else "",
                            style = MaterialTheme.typography.labelSmall.copy(color = T.mut), modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        )
                    }
                }
            }
        }
        if (t?.blocked == true) {
            Text("Вы ограничили переписку с этим человеком", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(16.dp))
            return@Column
        }
        Divider()
        if (placeOpen) Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Field(address, { address = it.take(140) }, "", placeholder = "Адрес встречи, например ул. Ахунбаева, 98")
            kg.tabyl.ui.Btn("Отправить адрес", { if (address.isNotBlank()) send(buildJsonObject { put("kind", "place"); put("address", address) }) { address = ""; placeOpen = false } })
        }
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            val pick = kg.tabyl.rememberPhotoPicker(1) { list ->
                list.firstOrNull()?.let { b -> scope.launch { runCatching { app.api.upload(b) }.onSuccess { p -> send(buildJsonObject { put("kind", "photo"); put("photoId", p.id) }) } } }
            }
            IconBtn(Icons.clip, "Отправить фото", { pick(1) })
            IconBtn(Icons.pin, "Отправить адрес встречи", { placeOpen = !placeOpen })
            Field(text, { text = it.take(2000) }, "", Modifier.weight(1f), placeholder = "Сообщение")
            IconBtn(Icons.send, "Отправить", { if (text.isNotBlank()) send(buildJsonObject { put("kind", "text"); put("body", text) }) { text = "" } }, bg = T.sun, tint = T.onSun)
        }
    }
}

@Composable
private fun Bubble(app: AppState, m: Msg, mine: Boolean, city: String) {
    val shape = RoundedCornerShape(18.dp)
    val bg = if (mine) T.mine else T.field
    when (m.kind) {
        "photo" -> AsyncImage(app.api.photoUrl(m.payload?.str("photoId") ?: "", 640), "Фото в чате", Modifier.widthIn(max = 230.dp).clip(shape), contentScale = ContentScale.FillWidth)
        "place" -> Column(Modifier.widthIn(max = 260.dp).clip(shape).background(bg).padding(horizontal = 14.dp, vertical = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.pin, null, Modifier.size(16.dp), tint = T.fg)
                Text(m.payload?.str("address") ?: m.body, style = MaterialTheme.typography.titleSmall)
            }
            m.payload?.str("note")?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            Text("Открыть в 2ГИС", style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.padding(top = 6.dp).press({ openUrl("https://2gis.kg/search/" + "$city ${m.payload?.str("address") ?: m.body}".encodeUrl()) }))
        }
        else -> Text(m.body, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.widthIn(max = 280.dp).clip(shape).background(bg).padding(horizontal = 13.dp, vertical = 9.dp))
    }
}

private fun String.encodeUrl(): String = buildString {
    for (b in this@encodeUrl.encodeToByteArray()) {
        val c = b.toInt().toChar()
        if (c.isLetterOrDigit() && b >= 0) append(c) else append("%" + (b.toInt() and 0xff).toString(16).uppercase().padStart(2, '0'))
    }
}
