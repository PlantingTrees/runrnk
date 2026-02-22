package com.runrnk.application.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.runrnk.application.models.RouteModel;
import com.runrnk.application.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RouteGenerationService {

    private final RouteRepository routeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ai.api.key}")
    private String apiKey;

    @Value("${ai.api.url}")
    private String apiUrl;

    public RouteModel generateRoute(double centerLat, double centerLng, String shape) {
        String prompt = buildPrompt(centerLat, centerLng, shape);
        String geoJson;
        try {
            String candidate = callGemini(prompt);
            geoJson = sanitizeAndValidateGeoJson(candidate, centerLat, centerLng);
        } catch (Exception e) {
            System.err.println("Gemini route generation failed. Using fallback route. Reason: " + e.getMessage());
            geoJson = generateFallbackRoute(centerLat, centerLng, shape);
        }

        RouteModel route = new RouteModel();
        route.setName(shape);
        route.setGeoJson(geoJson);
        route.setCenterLat(centerLat);
        route.setCenterLng(centerLng);
        route.setRadiusMeters(500);

        return routeRepository.save(route);
    }

    private String buildPrompt(double lat, double lng, String shape) {
        return String.format("""
            You are a GPS route designer. Create a running route shaped like a %s.
            
            STRICT RULES:
            - The route MUST start AND end at exactly [%f, %f] (this is where the runner is standing)
            - All coordinates must be within 500 meters of the start point
            - The route must follow real walkable/runnable paths (streets, paths, sidewalks)
            - The shape of the route when drawn on a map must visually resemble a %s
            - Use exactly 20 coordinate points
            - Coordinates are [longitude, latitude] format
            - The first and last coordinate must be exactly [%f, %f]
            - Return ONLY raw compact JSON, no markdown, no explanation, no spaces
            
            Return exactly this format:
            {"type":"LineString","coordinates":[[lng,lat],[lng,lat],...]}
        """, shape, lng, lat, shape, lng, lat);
    } 

   
    private String callGemini(String prompt) {
        WebClient client = WebClient.builder()
            .baseUrl(apiUrl + "?key=" + apiKey)
            .defaultHeader("Content-Type", "application/json")
            .build();
    
        Map<String, Object> body = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 8192,
                "responseMimeType","application/json",
                "thinkingConfig", Map.of(
                "thinkingBudget", 15 // 0 = disable thinking entirely
        )
            )
        );
    
        try {
            String response = client.post()
                .bodyValue(body)
                .retrieve()
                .onStatus(
                    status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> clientResponse.bodyToMono(String.class).map(errorBody -> {
                        throw new RuntimeException("Gemini API error: " + errorBody);
                    })
                )
                .bodyToMono(String.class)
                .block();
    
            System.out.println("Gemini raw response: " + response);
    
            JsonNode root = objectMapper.readTree(response);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new RuntimeException("Gemini returned no candidates");
            }
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new RuntimeException("Gemini returned no content parts");
            }

            String text = parts.get(0).path("text").asText().trim();
            if (text.isBlank()) {
                throw new RuntimeException("Gemini returned empty text");
            }

            // Strip markdown fences
            text = text
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                .trim();

            System.out.println("Parsed GeoJSON: " + text);
            return text;

        } catch (Exception e) {
            System.err.println("Gemini error: " + e.getMessage());
            throw new RuntimeException("Gemini route generation failed: " + e.getMessage());
        }
    }

    private String sanitizeAndValidateGeoJson(String rawText, double centerLat, double centerLng) throws Exception {
        String candidate = extractJsonObject(rawText);
        JsonNode parsed = objectMapper.readTree(candidate);
        JsonNode lineString = findLineStringNode(parsed);
        if (lineString == null) {
            throw new RuntimeException("No LineString geometry found in AI output");
        }

        JsonNode coords = lineString.path("coordinates");
        if (!coords.isArray() || coords.size() < 2) {
            throw new RuntimeException("AI output coordinates missing or too short");
        }

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("type", "LineString");
        ArrayNode normalizedCoords = objectMapper.createArrayNode();

        for (JsonNode coord : coords) {
            if (!coord.isArray() || coord.size() < 2) {
                throw new RuntimeException("Invalid coordinate entry in AI output");
            }

            double lng = coord.get(0).asDouble(Double.NaN);
            double lat = coord.get(1).asDouble(Double.NaN);
            if (Double.isNaN(lng) || Double.isNaN(lat)) {
                throw new RuntimeException("Coordinate contains non-numeric values");
            }

            double distance = haversineMeters(centerLat, centerLng, lat, lng);
            if (distance > 700) {
                throw new RuntimeException("AI route drifts too far from center (" + Math.round(distance) + "m)");
            }

            ArrayNode point = objectMapper.createArrayNode();
            point.add(lng);
            point.add(lat);
            normalizedCoords.add(point);
        }

        if (!samePoint(normalizedCoords.get(0), normalizedCoords.get(normalizedCoords.size() - 1))) {
            normalizedCoords.add(normalizedCoords.get(0).deepCopy());
        }

        normalized.set("coordinates", normalizedCoords);
        return objectMapper.writeValueAsString(normalized);
    }

    private JsonNode findLineStringNode(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        if (node.isObject()
            && "LineString".equalsIgnoreCase(node.path("type").asText())
            && node.path("coordinates").isArray()) {
            return node;
        }

        if (node.isObject()) {
            for (JsonNode child : node) {
                JsonNode found = findLineStringNode(child);
                if (found != null) return found;
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                JsonNode found = findLineStringNode(child);
                if (found != null) return found;
            }
        }

        return null;
    }

    private String extractJsonObject(String text) {
        String trimmed = text.trim();
        int firstBrace = trimmed.indexOf('{');
        int lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return trimmed.substring(firstBrace, lastBrace + 1);
        }
        return trimmed;
    }

    private boolean samePoint(JsonNode a, JsonNode b) {
        if (a == null || b == null || !a.isArray() || !b.isArray() || a.size() < 2 || b.size() < 2) {
            return false;
        }
        double alng = a.get(0).asDouble(Double.NaN);
        double alat = a.get(1).asDouble(Double.NaN);
        double blng = b.get(0).asDouble(Double.NaN);
        double blat = b.get(1).asDouble(Double.NaN);
        if (Double.isNaN(alng) || Double.isNaN(alat) || Double.isNaN(blng) || Double.isNaN(blat)) {
            return false;
        }
        return Math.abs(alng - blng) < 1e-7 && Math.abs(alat - blat) < 1e-7;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadius = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    private String generateFallbackRoute(double centerLat, double centerLng, String shape) {
        try {
            int totalPoints = 20;
            double radiusMeters = 180.0;
            double shapeSeed = Math.abs(shape == null ? 3 : shape.hashCode() % 11) + 1;

            double metersPerDegLat = 111_320d;
            double metersPerDegLng = Math.max(10d, Math.cos(Math.toRadians(centerLat)) * 111_320d);

            ObjectNode line = objectMapper.createObjectNode();
            line.put("type", "LineString");
            ArrayNode coords = objectMapper.createArrayNode();

            for (int i = 0; i < totalPoints - 1; i++) {
                double angle = (2 * Math.PI * i) / (totalPoints - 1);
                double wobble = 1.0 + 0.18 * Math.sin((shapeSeed % 5 + 2) * angle);
                double xMeters = radiusMeters * wobble * Math.cos(angle);
                double yMeters = radiusMeters * wobble * Math.sin(angle);

                double lng = centerLng + (xMeters / metersPerDegLng);
                double lat = centerLat + (yMeters / metersPerDegLat);

                ArrayNode point = objectMapper.createArrayNode();
                point.add(lng);
                point.add(lat);
                coords.add(point);
            }

            coords.add(coords.get(0).deepCopy()); // close the loop
            line.set("coordinates", coords);
            return objectMapper.writeValueAsString(line);
        } catch (Exception e) {
            throw new RuntimeException("Fallback route generation failed: " + e.getMessage(), e);
        }
    }
}
