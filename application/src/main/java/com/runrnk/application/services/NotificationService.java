package com.runrnk.application.services;
import com.runrnk.application.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final SimpMessagingTemplate messagingTemplate;
    
    public void notifyMatchFound(String username, MatchFoundMessage message) {
        messagingTemplate.convertAndSendToUser(
            username, "/queue/match-found", message
        );
        messagingTemplate.convertAndSend(
            "/topic/user/" + username + "/queue/match-found", message
        );
    }
    
    public void notifyQueueExpired(String username, QueueExpiredMessage message) {
        messagingTemplate.convertAndSendToUser(
            username, "/queue/queue-expired", message
        );
        messagingTemplate.convertAndSend(
            "/topic/user/" + username + "/queue/queue-expired", message
        );
    }

    public void sendPhoto(String toUsername, PhotoMessage message) {
        messagingTemplate.convertAndSendToUser(
            toUsername, "/queue/photo", message
        );
        messagingTemplate.convertAndSend(
            "/topic/user/" + toUsername + "/queue/photo", message
        );
    }

    public void sendRaceUpdate(String toUsername, RaceUpdateMessage message) {
        messagingTemplate.convertAndSendToUser(
            toUsername, "/queue/race-update", message
        );
        messagingTemplate.convertAndSend(
            "/topic/user/" + toUsername + "/queue/race-update", message
        );
    }
}
