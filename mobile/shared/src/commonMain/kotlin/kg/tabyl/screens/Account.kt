package kg.tabyl.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kg.tabyl.AppState
import kg.tabyl.Prefs
import kg.tabyl.Route
import kg.tabyl.data.ApiException
import kg.tabyl.data.Card
import kg.tabyl.data.count
import kg.tabyl.data.formatPhone
import kg.tabyl.data.formatPrice
import kg.tabyl.ui.Btn
import kg.tabyl.ui.CategoryPill
import kg.tabyl.ui.Divider
import kg.tabyl.ui.ErrorLine
import kg.tabyl.ui.Field
import kg.tabyl.ui.Gap
import kg.tabyl.ui.Icons
import kg.tabyl.ui.Island
import kg.tabyl.ui.Kind
import kg.tabyl.ui.T
import kg.tabyl.ui.TopBar
import kg.tabyl.ui.press
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(app: AppState, r: Route.Login) {
    var register by remember { mutableStateOf(r.register) }
    var step by remember { mutableStateOf("phone") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var consent by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun send() = scope.launch {
        error = null
        if (register && name.isBlank()) { error = "Как вас зовут? Имя увидят покупатели"; return@launch }
        if (register && !consent) { error = "Нужно согласие с правилами"; return@launch }
        busy = true
        runCatching { app.api.requestCode(phone) }.onSuccess { step = "code" }.onFailure { error = it.message }
        busy = false
    }
    fun verify() = scope.launch {
        error = null
        busy = true
        runCatching { app.api.verify(phone, code) }
            .onSuccess { user ->
                if (register && name.isNotBlank() && user.name.isBlank()) runCatching { app.api.updateMe(name.trim(), user.city) }
                app.onSignedIn(user)
                app.back()
                r.next?.let { app.go(it) }
            }
            .onFailure { error = it.message }
        busy = false
    }

    Column(Modifier.fillMaxSize().background(T.bg).verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
        TopBar("", { if (step == "code") step = "phone" else app.back() })
        Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            AnimatedContent(step, label = "login") { s ->
                if (s == "code") Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Код из СМС", style = MaterialTheme.typography.titleLarge)
                    Text("Отправили на ${formatPhone(normalized(phone))}", style = MaterialTheme.typography.bodySmall)
                    Field(code, { code = it.filter(Char::isDigit).take(6); if (code.length == 6) verify() }, "", placeholder = "••••••", keyboard = KeyboardType.NumberPassword, error = error, autoFocus = true)
                    Btn(if (busy) "Проверяем…" else if (register) "Создать аккаунт" else "Войти", { verify() }, Modifier.fillMaxWidth(), enabled = !busy && code.length == 6)
                    Text("Отправить код ещё раз", style = MaterialTheme.typography.bodySmall, modifier = Modifier.press({ send() }).padding(vertical = 8.dp))
                } else Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Segmented(register) { register = it; error = null }
                    Text(if (register) "Новый аккаунт" else "С возвращением", style = MaterialTheme.typography.titleLarge)
                    Text(
                        if (register) "Минута — и можно продавать, писать продавцам и сохранять объявления." else "Войдите по номеру — пароль не нужен, придёт код в СМС.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    if (register) Field(name, { name = it.take(40) }, "Имя", placeholder = "Как к вам обращаться")
                    Field(phone, { phone = it.filter { c -> c.isDigit() || c == ' ' }.take(12) }, "Номер телефона", placeholder = "700 123 456", prefix = "+996", keyboard = KeyboardType.Phone)
                    if (register) Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(consent, { consent = it }, colors = CheckboxDefaults.colors(checkedColor = T.ink, checkmarkColor = T.onInk))
                        Text("Согласен с правилами и обработкой персональных данных", style = MaterialTheme.typography.bodySmall.copy(color = T.fg))
                    }
                    ErrorLine(error)
                    Btn(if (busy) "Отправляем код…" else "Получить код", { send() }, Modifier.fillMaxWidth(), enabled = !busy)
                    Btn(if (register) "Зарегистрироваться через Google" else "Войти через Google", { error = "Вход через Google пока не работает. Войдите по номеру телефона" }, Modifier.fillMaxWidth(), kind = Kind.Field)
                    Text(
                        if (register) "Уже есть аккаунт? Войти" else "Впервые на Табыле? Зарегистрироваться",
                        style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.align(Alignment.CenterHorizontally).press({ register = !register }).padding(8.dp),
                    )
                }
            }
        }
    }
}

private fun normalized(p: String) = "+996" + p.filter(Char::isDigit).takeLast(9)

@Composable
private fun Segmented(register: Boolean, onChange: (Boolean) -> Unit) {
    BoxWithConstraints(Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp)).background(T.field).padding(4.dp)) {
        val half = maxWidth / 2
        val x by animateDpAsState(if (register) half else 0.dp, label = "seg")
        Box(Modifier.offset(x = x).width(half).fillMaxHeight().clip(RoundedCornerShape(9.dp)).background(T.bg))
        Row(Modifier.fillMaxSize()) {
            listOf(false to "Вход", true to "Регистрация").forEach { (v, label) ->
                Box(Modifier.weight(1f).fillMaxHeight().press({ onChange(v) }, label), contentAlignment = Alignment.Center) {
                    Text(label, style = MaterialTheme.typography.labelLarge.copy(color = if (register == v) T.fg else T.mut))
                }
            }
        }
    }
}

private val STATUS = mapOf("active" to "Опубликовано", "pending" to "На проверке", "rejected" to "Отклонено", "sold" to "Продано", "closed" to "Снято")

@Composable
fun ProfileScreen(app: AppState) {
    val me = app.me
    if (me == null) {
        Column(Modifier.fillMaxSize().padding(8.dp)) {
            Island(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Профиль", style = MaterialTheme.typography.titleLarge)
                    Text("Войдите, чтобы подавать объявления, писать продавцам и видеть избранное на всех устройствах.", style = MaterialTheme.typography.bodySmall)
                    Btn("Войти или зарегистрироваться", { app.go(Route.Login(register = true)) }, Modifier.fillMaxWidth())
                }
            }
            Gap(10.dp)
            Island(Modifier.fillMaxWidth()) { Categories(app) }
        }
        return
    }
    val mine = remember { mutableStateListOf<Card>() }
    var name by remember { mutableStateOf(me.name) }
    var city by remember { mutableStateOf(me.city) }
    var msg by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(me.id) { runCatching { app.api.myAds() }.onSuccess { mine.clear(); mine.addAll(it.items) } }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Island(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(me.name.ifBlank { "Профиль" }, style = MaterialTheme.typography.titleLarge)
                Text(me.phone?.let(::formatPhone) ?: me.email ?: "", style = MaterialTheme.typography.bodySmall)
                Text("Как вас видят покупатели", style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.press({ app.go(Route.Seller(me.id)) }).padding(vertical = 6.dp))
            }
        }
        Island(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Мои объявления", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Text("Подать новое", style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.press({ app.go(Route.Post()) }).padding(6.dp))
                }
                if (mine.isEmpty()) Text("Пока ничего. Первое объявление публикуется за пару минут.", style = MaterialTheme.typography.bodySmall)
                mine.forEach { a ->
                    Row(Modifier.fillMaxWidth().press({ app.go(Route.Ad(a.id)) }).padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(T.field)) {
                            a.photo?.let { AsyncImage(app.api.photoUrl(it.id, 320), null, Modifier.fillMaxSize(), contentScale = androidx.compose.ui.layout.ContentScale.Crop) }
                        }
                        Column(Modifier.weight(1f)) {
                            Text(a.title, style = MaterialTheme.typography.bodyMedium, maxLines = 1)
                            Text(formatPrice(a.price, a.currency), style = MaterialTheme.typography.titleSmall)
                            Text("${STATUS[a.status] ?: a.status} · ${count(a.views, "просмотр", "просмотра", "просмотров")}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Divider()
                }
            }
        }
        Island(Modifier.fillMaxWidth()) { Categories(app) }
        Island(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Настройки", style = MaterialTheme.typography.titleMedium)
                Field(name, { name = it.take(40) }, "Имя для объявлений")
                Text("Город", style = MaterialTheme.typography.bodySmall)
                androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items((app.meta?.cities ?: emptyList()).size) { i ->
                        val c = app.meta!!.cities[i]
                        Chip(c.name, city == c.slug) { city = c.slug }
                    }
                }
                Btn("Сохранить", {
                    scope.launch {
                        runCatching { app.api.updateMe(name, city) }
                            .onSuccess { Prefs.set("city", city); app.refreshMe(); msg = "Сохранено" }
                            .onFailure { msg = (it as? ApiException)?.message }
                    }
                })
                msg?.let { Text(it, style = MaterialTheme.typography.bodySmall.copy(color = if (it == "Сохранено") T.ok else T.danger)) }
            }
        }
        Btn("Выйти", { scope.launch { app.signOut() } }, Modifier.fillMaxWidth(), kind = Kind.Field)
        Gap(12.dp)
    }
}

@Composable
private fun Categories(app: AppState) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Категории", style = MaterialTheme.typography.titleMedium)
        androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            app.meta?.categories?.forEach { c -> CategoryPill(c.name, Icons.category(c.slug), false) { app.go(Route.Search(category = c.slug)) } }
        }
    }
}
