package e205.eyespeak.domain.log.controller;

import e205.eyespeak.global.common.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/usage-logs")
public class UsageLogController {

    @PostMapping
    public ApiResponse<Void> create() {
        return ApiResponse.created();
    }
}
