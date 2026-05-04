package com.ducky.lms.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

    LaunchedEffect(search) {
        loading = true
        errorMsg = ""
        try {
            val resp = RetrofitClient.apiService.getResources("Bearer ${Session.token}", search = search, pageSize = 50)
            resources = resp.items
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DuckyYellow, titleContentColor = DuckyDark)
            ) 
        },
        floatingActionButton = {
           ExtendedFloatingActionButton(
               onClick = {
                   Session.token = ""
                   Session.role = ""
                   navController.navigate("login") {
                       popUpTo("home") { inclusive = true }
                   }
               },
               containerColor = DuckyDark,
               contentColor = Color.White
           ) { Text("Cerrar Sesión") }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().background(DuckyLightGray).padding(16.dp)) {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Buscar título o autor...") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = Color.White, focusedBorderColor = DuckyDark, cursorColor = DuckyDark)
            )

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
                Text(text = "Mostrando ${resources.size} de $totalResources registrados", color = Color.Gray, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp))
                LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 80.dp) /* fab padding */) {
                    items(resources) { res ->
                        ResourceCard(res)
                        Spacer(modifier = Modifier.height(12.dp))
                    }
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
                
            }
        }
    }
}
