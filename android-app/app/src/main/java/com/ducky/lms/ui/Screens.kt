package com.ducky.lms.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.ducky.lms.network.LoginRequest
import com.ducky.lms.network.ResourceDto
import com.ducky.lms.network.RetrofitClient
import com.ducky.lms.network.Session
import kotlinx.coroutines.launch

val DuckyYellow = Color(0xFFFFD400)
val DuckyDark = Color(0xFF212529)
val DuckyGreen = Color(0xFF2E8B57)
val DuckyRed = Color(0xFFAA0000)
val DuckyLightGray = Color(0xFFF9F9F9)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(navController: NavController) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        topBar = { 
            TopAppBar(
                title = { Text("Ducky LMS Login", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DuckyYellow, titleContentColor = DuckyDark)
            ) 
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Ingresar al Portal", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = DuckyDark)
            Spacer(modifier = Modifier.height(24.dp))
            
            if (errorMsg.isNotEmpty()) {
                Surface(color = DuckyRed.copy(alpha = 0.1f), shape = MaterialTheme.shapes.small, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                    Text(text = errorMsg, color = DuckyRed, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium)
                }
            }
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Correo (ej. ada.lovelace@ducky.edu)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = DuckyDark, cursorColor = DuckyDark)
            )
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Contraseña") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = DuckyDark, cursorColor = DuckyDark)
            )
            Spacer(modifier = Modifier.height(32.dp))
            Button(
                onClick = {
                    loading = true
                    errorMsg = ""
                    coroutineScope.launch {
                        try {
                            val resp = RetrofitClient.apiService.login(LoginRequest(email.trim(), password))
                            Session.token = resp.token
                            Session.role = resp.user.rol
                            navController.navigate("home") {
                                popUpTo("login") { inclusive = true }
                            }
                        } catch (e: Exception) {
                            errorMsg = "Login fallido: Verifica las credenciales. (${e.message})"
                        } finally {
                            loading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DuckyDark, contentColor = Color.White)
            ) {
                if(loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                else Text("Iniciar Sesión", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController) {
    var resources by remember { mutableStateOf<List<ResourceDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var totalResources by remember { mutableStateOf(0) }
    var errorMsg by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()

    var page by remember { mutableStateOf(1) }
    var selectedFilter by remember { mutableStateOf("") }
    val pageSize = 10

    val filterOptions = listOf(
        "" to "Todos",
        "book" to "Libros",
        "e_book" to "E-Books",
        "journal_magazine" to "Revistas Físicas",
        "e_journal" to "Revistas Electrónicas",
        "digital_article" to "Artículos",
        "map" to "Mapas",
        "video" to "Videos",
        "audio_music" to "Audio/Música"
    )

    LaunchedEffect(search, page, selectedFilter) {
        loading = true
        errorMsg = ""
        try {
            val resp = RetrofitClient.apiService.getResources("Bearer ${Session.token}", search = search, tipo = selectedFilter, page = page, pageSize = pageSize)
            resources = resp.items.sortedBy { it.titulo.lowercase() }
            totalResources = resp.total
        } catch (e: Exception) {
            errorMsg = "API Falló: ${e.message}"
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = { 
            TopAppBar(
                title = { Text("Catálogo de Recursos", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DuckyYellow, titleContentColor = DuckyDark),
                actions = {
                    TextButton(onClick = {
                        Session.token = ""
                        Session.role = ""
                        navController.navigate("login") {
                            popUpTo("home") { inclusive = true }
                        }
                    }) {
                        Text("Salir", fontWeight = FontWeight.Bold, color = DuckyDark)
                    }
                }
            ) 
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().background(DuckyLightGray).padding(16.dp)) {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it; page = 1 },
                label = { Text("Buscar título o autor...") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = Color.White, focusedBorderColor = DuckyDark, cursorColor = DuckyDark)
            )

            LazyRow(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                items(filterOptions) { (key, label) ->
                    val isSelected = selectedFilter == key
                    Surface(
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .clickable { selectedFilter = key; page = 1 },
                        shape = MaterialTheme.shapes.small,
                        color = if (isSelected) DuckyDark else Color.White,
                        border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, DuckyDark) else null
                    ) {
                        Text(
                            text = label,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            color = if (isSelected) Color.White else DuckyDark,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = DuckyDark)
                }
            } else if (errorMsg.isNotEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(errorMsg, color = DuckyRed, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                }
            } else if (resources.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No se encontraron recursos.", color = Color.Gray)
                }
            } else {
                val totalPages = if (totalResources == 0) 1 else (totalResources + pageSize - 1) / pageSize
                Text(text = "Mostrando ${resources.size} de $totalResources registrados (Página $page de $totalPages)", color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp))
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(resources) { res ->
                        ResourceCard(res)
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = { if (page > 1) page-- },
                        enabled = page > 1,
                        colors = ButtonDefaults.buttonColors(containerColor = DuckyDark)
                    ) { Text("Anterior") }
                    Button(
                        onClick = { if (page < totalPages) page++ },
                        enabled = page < totalPages,
                        colors = ButtonDefaults.buttonColors(containerColor = DuckyDark)
                    ) { Text("Siguiente") }
                }
            }
        }
    }
}

@Composable
fun ResourceCard(resource: ResourceDto) {
    var expanded by remember { mutableStateOf(false) }
    Card(
        modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = resource.titulo, fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.titleMedium)
                    val formatType = resource.tipo.replace("_", " ").replaceFirstChar { it.uppercase() }
                    Text(text = formatType, color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                }
                Surface(
                    color = if(resource.disponible) DuckyGreen else DuckyRed,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(
                        text = if(resource.disponible) "Disponible" else "No disp.",
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "📍 Ubicación: ", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                Text(text = resource.ubicacion ?: "Sin asignar", color = Color.DarkGray, style = MaterialTheme.typography.bodySmall)
            }
            
            if (expanded) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = DuckyLightGray, thickness = 1.dp)
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(text = "Autor:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                Text(text = resource.autor ?: "Desconocido", color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))

                if (!resource.editorial.isNullOrEmpty()) {
                    Text(text = "Editorial:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.editorial, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (resource.ano_publicacion != null) {
                    Text(text = "Año de publicación:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.ano_publicacion.toString(), color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.isbn.isNullOrEmpty()) {
                    Text(text = "ISBN:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.isbn, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.journal_issn.isNullOrEmpty()) {
                    Text(text = "ISSN:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.journal_issn, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.maps_scale.isNullOrEmpty()) {
                    Text(text = "Escala de Mapa:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.maps_scale, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.maps_type.isNullOrEmpty()) {
                    Text(text = "Tipo de Mapa:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.maps_type, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (resource.audiovisual_minutes != null) {
                    Text(text = "Duración (minutos):", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = "${resource.audiovisual_minutes} min", color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (resource.article_volume != null) {
                    Text(text = "Volumen:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.article_volume.toString(), color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.lenguajes.isNullOrEmpty()) {
                    Text(text = "Lenguajes:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.lenguajes, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
                if (!resource.sinopsis.isNullOrEmpty()) {
                    Text(text = "Sinopsis:", fontWeight = FontWeight.Bold, color = DuckyDark, style = MaterialTheme.typography.bodySmall)
                    Text(text = resource.sinopsis, color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
        }
    }
}
