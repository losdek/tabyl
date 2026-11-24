package kg.tabyl.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import kg.tabyl.AppState
import kg.tabyl.Route
import kg.tabyl.data.NBSP
import kg.tabyl.data.formatNumber
import kg.tabyl.openUrl
import kg.tabyl.ui.Btn
import kg.tabyl.ui.Kind
import kg.tabyl.ui.T
import kg.tabyl.ui.TopBar
import kg.tabyl.ui.press
import kotlinx.coroutines.launch

@Composable
fun PromoteScreen(app: AppState, adId: String) {
    val tiers = app.meta?.tiers ?: emptyMap()
    var pick by remember { mutableStateOf("top3") }
    var pendingOrder by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().background(T.bg)) {
        TopBar("Продвижение", { app.back() })
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Продвинутые объявления показываются в начале ленты и поиска с пометкой «Реклама».", style = MaterialTheme.typography.bodySmall)
            tiers.forEach { (key, t) ->
                val on = key == pick
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (on) T.field else T.bg).border(1.dp, if (on) T.fg else T.line, RoundedCornerShape(14.dp)).press({ pick = key }, t.name).padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(t.name, style = MaterialTheme.typography.titleSmall)
                        Text(t.note, style = MaterialTheme.typography.bodySmall)
                    }
                    Text("${formatNumber(t.price)}${NBSP}сом", style = MaterialTheme.typography.labelLarge.copy(color = T.onSun), modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(T.sun).padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            Text(
                if (app.meta?.payments == "freedom") "Оплата картой через Freedom Pay." else "Платёжная система не подключена — откроется тестовая оплата, деньги не списываются.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            pendingOrder?.let { o ->
                Btn("Проверить оплату", {
                    scope.launch { runCatching { app.api.order(o) }.onSuccess { if (it.status == "paid") { app.toast = "Оплачено — объявление в топе"; app.back() } else app.toast = "Банк ещё не подтвердил оплату" } }
                }, Modifier.fillMaxWidth(), kind = Kind.Field)
            }
            Btn(if (busy) "Создаём заказ…" else "Перейти к оплате", {
                busy = true
                scope.launch {
                    runCatching { app.api.promote(adId, pick) }
                        .onSuccess { p ->
                            if (p.provider == "stub") app.go(Route.TestPay(p.orderId, p.amount, tiers[pick]?.name ?: pick))
                            else p.paymentUrl?.let { pendingOrder = p.orderId; openUrl(it) }
                        }
                        .onFailure { app.toast = it.message }
                    busy = false
                }
            }, Modifier.fillMaxWidth(), enabled = !busy)
        }
    }
}

/** Stand-in checkout while Freedom Pay keys are absent; same server path as a real payment. */
@Composable
fun TestPayScreen(app: AppState, r: Route.TestPay) {
    var result by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().background(T.bg).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        TopBar("", { app.back() })
        Text("Тестовый режим: деньги не списываются.", style = MaterialTheme.typography.bodySmall.copy(color = T.fg), modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(T.field).padding(12.dp))
        Text(r.tier, style = MaterialTheme.typography.titleLarge)
        Text("${formatNumber(r.amount)}${NBSP}сом", style = MaterialTheme.typography.titleLarge)
        when (result) {
            null -> {
                Btn("Оплатить", { scope.launch { result = runCatching { app.api.testPay(r.orderId, true).status }.getOrDefault("failed") } }, Modifier.fillMaxWidth())
                Text("Отказаться от оплаты", style = MaterialTheme.typography.bodySmall, modifier = Modifier.press({ scope.launch { result = runCatching { app.api.testPay(r.orderId, false).status }.getOrDefault("failed") } }).padding(8.dp))
            }
            "paid" -> {
                Text("Оплачено. Объявление уже в топе.", style = MaterialTheme.typography.titleMedium)
                Btn("К объявлению", { app.back(); app.back() }, Modifier.fillMaxWidth(), kind = Kind.Field)
            }
            else -> {
                Text("Оплата не прошла. Деньги не списаны.", style = MaterialTheme.typography.titleMedium)
                Btn("Назад", { app.back() }, Modifier.fillMaxWidth(), kind = Kind.Field)
            }
        }
    }
}
