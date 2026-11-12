package com.ipvio.stream

import android.content.Context
import android.content.pm.ActivityInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val LoginBg = Color(0xFF070708)
private val LoginField = Color(0xFF0F1013)
private val LoginBorder = Color(0xFF2B2E36)
private val LoginCyan = Color(0xFF29C7F5)
private val LoginHint = Color(0xFF6B7080)

/**
 * Login screen for phone mode (server fixed by the panel, so only user and password).
 * Portrait while it is shown; fields open the keyboard with one tap (no "press OK to edit" step as on the TV).
 */
@Composable
fun PhoneLogin(
    user: String, onUser: (String) -> Unit,
    pass: String, onPass: (String) -> Unit,
    error: String?,
    onSubmit: () -> Unit
) {
    val ctx = LocalContext.current
    var showPass by remember { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    val version = remember { runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "" }

    // This screen is portrait; afterwards the normal phone orientation applies again.
    DisposableEffect(Unit) {
        val act = DeviceMode.activityOf(ctx)
        act?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        onDispose { act?.let { MobilePrefs.apply(it) } }
    }

    Box(Modifier.fillMaxSize().background(LoginBg), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.fillMaxHeight().widthIn(max = 440.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            BrandMark(Modifier.size(112.dp).clip(RoundedCornerShape(26.dp)))
            Text(
                "VERSIÓN $version • MÓVIL", color = LoginCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp, textAlign = TextAlign.Center, raw = true, modifier = Modifier.padding(bottom = 18.dp)
            )

            LoginLabel("USUARIO", AIcon.Person)
            LoginInput(user, onUser, "Ingresa tu usuario IPTV...", ImeAction.Next, KeyboardType.Ascii, false,
                onAction = { focus.moveFocus(FocusDirection.Down) })

            Box(Modifier.height(4.dp))
            LoginLabel("CONTRASEÑA", AIcon.Lock)
            LoginInput(pass, onPass, "Ingresa tu contraseña...", ImeAction.Done, KeyboardType.Password, !showPass,
                trailing = { AppIcon(if (showPass) AIcon.EyeOff else AIcon.Eye, Muted, Modifier.clickable { showPass = !showPass }.padding(8.dp), 22.dp) },
                onAction = { focus.clearFocus(); onSubmit() })

            error?.let {
                Text(it, color = DS.Danger, fontSize = 14.sp, lineHeight = 18.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
            }

            Row(
                Modifier.padding(top = 18.dp).clip(RoundedCornerShape(14.dp)).clickable { focus.clearFocus(); onSubmit() }
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                AppIcon(AIcon.Right, Color.White, size = 20.dp)
                Text("INGRESAR AL SERVICIO [OK]", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, raw = true)
            }
        }
    }
}

@Composable
private fun LoginLabel(text: String, icon: AIcon) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AppIcon(icon, LoginCyan, size = 18.dp)
        Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, raw = true)
    }
}

@Composable
private fun LoginInput(
    value: String, onChange: (String) -> Unit, hint: String,
    ime: ImeAction, type: KeyboardType, hide: Boolean,
    trailing: (@Composable () -> Unit)? = null,
    onAction: () -> Unit
) {
    var f by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(16.dp)
    Row(
        Modifier.fillMaxWidth().height(58.dp).clip(shape).background(LoginField)
            .border(1.5.dp, if (f) LoginCyan else LoginBorder, shape)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (value.isEmpty()) Text(hint, color = LoginHint, fontSize = 16.sp, maxLines = 1, raw = true)
            BasicTextField(
                value = value, onValueChange = onChange, singleLine = true,
                textStyle = TextStyle(color = Color.White, fontSize = 17.sp),
                cursorBrush = SolidColor(LoginCyan),
                visualTransformation = if (hide) PasswordVisualTransformation() else VisualTransformation.None,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, keyboardType = type, imeAction = ime),
                keyboardActions = KeyboardActions(onNext = { onAction() }, onDone = { onAction() }),
                modifier = Modifier.fillMaxWidth().onFocusChanged { f = it.isFocused }
            )
        }
        trailing?.invoke()
    }
}
