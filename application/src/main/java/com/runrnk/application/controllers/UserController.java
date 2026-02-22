package com.runrnk.application.controllers;

import com.runrnk.application.enums.Rank;
import com.runrnk.application.models.UserModel;
import com.runrnk.application.repository.UserRepository;
import com.runrnk.application.services.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final TokenService tokenService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        if (userRepository.findByUsername(req.username()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already taken");
        }

        UserModel user = new UserModel();
        user.setUsername(req.username());
        user.setRank(Rank.TODDLER);
        user.setTokens(100);
        user.setTimezone(req.timezone());
        user.setHasEverLost(false);
        tokenService.scheduleTokenReset(user);
        userRepository.save(user);

        return ResponseEntity.ok(toResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userRepository.findByUsername(req.username())
            .<ResponseEntity<?>>map(user -> ResponseEntity.ok(toResponse(user)))
            .orElse(ResponseEntity.status(404).body("User not found"));
    }

    private UserResponse toResponse(UserModel user) {
        return new UserResponse(
            user.getId(),
            user.getUsername(),
            user.getTokens(),
            user.getRank().name()
        );
    }

    public record RegisterRequest(String username, String timezone) {}
    public record LoginRequest(String username) {}
    public record UserResponse(Long id, String username, int tokens, String rank) {}
}