package com.runrnk.application.controllers;

import com.runrnk.application.models.RouteModel;
import com.runrnk.application.repository.MatchRepository;
import com.runrnk.application.services.RouteGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/route")
@RequiredArgsConstructor
public class RouteController {

    private final MatchRepository matchRepository;
    private final RouteGenerationService routeGenerationService;

    // Frontend polls this to get the route for a match
    @GetMapping("/{matchId}")
    public ResponseEntity<?> getRoute(@PathVariable Long matchId) {
        return matchRepository.findById(matchId)
            .map(match -> {
                if (match.getRoute() == null) {
                    return ResponseEntity.accepted().body(Map.of(
                        "status", "PENDING",
                        "message", "Route not yet generated"
                    ));
                }
                return ResponseEntity.ok(match.getRoute().getGeoJson());
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Test endpoint — generate a route manually
    @PostMapping("/generate")
    public ResponseEntity<?> generateRoute(
        @RequestParam double lat,
        @RequestParam double lng,
        @RequestParam(defaultValue = "dog") String shape
    ) {
        RouteModel route = routeGenerationService.generateRoute(lat, lng, shape);
        return ResponseEntity.ok(route.getGeoJson());
    }
}
