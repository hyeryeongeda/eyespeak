package e205.eyespeak.domain.setting.controller;

import e205.eyespeak.global.common.ApiResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/tts")
public class TtsController {

    @PostMapping("/voices")
    public ApiResponse<?> uploadVoices(@RequestPart("files") List<MultipartFile> files) {
        return ApiResponse.created(null);
    }

    @PostMapping("/train")
    public ApiResponse<?> startTraining() {
        return ApiResponse.ok(null);
    }

    @GetMapping("/status")
    public ApiResponse<?> getStatus() {
        return ApiResponse.ok(null);
    }

    @PostMapping("/synthesize")
    public ApiResponse<?> synthesize() {
        return ApiResponse.ok(null);
    }

    @PostMapping("/test")
    public ApiResponse<?> test() {
        return ApiResponse.ok(null);
    }
}
