package com.ducky.lms.network

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

data class LoginRequest(val email: String, val password: String)
data class UserDto(val id: Int, val nombre: String, val rol: String)
data class LoginResponse(val token: String, val user: UserDto)

data class ResourceDto(
    val id: Int,
    val titulo: String,
    val autor: String?,
    val tipo: String,
    val disponible: Boolean,
    val ubicacion: String?
)
data class ResourcesResponse(val items: List<ResourceDto>, val total: Int)

interface ApiService {
    @POST("/api/auth/login")
    suspend fun login(@Body req: LoginRequest): LoginResponse

    @GET("/api/resources")
    suspend fun getResources(
        @Header("Authorization") token: String,
        @Query("search") search: String = "",
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 50
    ): ResourcesResponse
}

object RetrofitClient {
    // 10.0.2.2 is the special IP for Android emulator to hit host's localhost (BFF Service on port 4000)
    private const val BASE_URL = "http://10.0.2.2:4000"

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}

object Session {
    var token: String = ""
    var role: String = ""
}
