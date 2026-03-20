package e205.eyespeak.global.util;

import e205.eyespeak.global.error.BusinessException;
import e205.eyespeak.global.error.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Component
public class FileStorageUtil {

    @Value("${file.upload.base-dir}")
    private String baseDir;

    public String saveFile(Long matchingId, MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String relativePath = "tts/" + matchingId + "/" + uuid + "_" + originalFilename;

        Path absolutePath = Paths.get(baseDir).resolve(relativePath);

        try {
            Files.createDirectories(absolutePath.getParent());
            file.transferTo(absolutePath.toFile());
        } catch (IOException e) {
            log.error("파일 저장 실패: {}", absolutePath, e);
            throw new BusinessException(ErrorCode.TTS_FILE_SAVE_FAILED);
        }

        return relativePath.replace("\\", "/");
    }

    public void deleteFile(String relativePath) {
        Path absolutePath = Paths.get(baseDir).resolve(relativePath);
        try {
            Files.deleteIfExists(absolutePath);
        } catch (IOException e) {
            log.warn("파일 삭제 실패 (무시): {}", absolutePath, e);
        }
    }
}
