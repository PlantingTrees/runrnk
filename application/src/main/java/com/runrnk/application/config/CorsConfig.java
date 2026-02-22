package com.runrnk.application.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        for (String origin : resolveAllowedOrigins()) {
            config.addAllowedOriginPattern(origin);
        }
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    private List<String> resolveAllowedOrigins() {
        String configured = System.getenv("APP_ALLOWED_ORIGINS");
        if (configured == null || configured.isBlank()) {
            return List.of("http://localhost:5173", "http://127.0.0.1:5173");
        }

        return Arrays.stream(configured.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList();
    }
}
