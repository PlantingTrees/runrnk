package com.runrnk.application.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Configuration
@EnableWebSocketMessageBroker // Keeps STOMP active
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(resolveAllowedOrigins())
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(
                        ServerHttpRequest request,
                        org.springframework.web.socket.WebSocketHandler wsHandler,
                        Map<String, Object> attributes
                    ) {
                        String username = UriComponentsBuilder.fromUri(request.getURI())
                            .build()
                            .getQueryParams()
                            .getFirst("username");
                        final String principalName = (username == null || username.isBlank())
                            ? "anon-" + UUID.randomUUID()
                            : username;
                        return () -> principalName;
                    }
                })
                .withSockJS();
    }

    private String[] resolveAllowedOrigins() {
        String configured = System.getenv("APP_ALLOWED_ORIGINS");
        if (configured == null || configured.isBlank()) {
            return new String[] {"http://localhost:5173", "http://127.0.0.1:5173"};
        }

        List<String> origins = Arrays.stream(configured.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList();
        return origins.toArray(String[]::new);
    }
}
