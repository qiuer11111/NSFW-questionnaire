const { q1, q2, q30, q31, video_base64 } = req.body;

// 如果有视频，解码并上传到 Supabase Storage
let videoUrl = null;
if (video_base64) {
    try {
        const base64Data = video_base64.split(',')[1] || video_base64;
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { data, error } = await supabase.storage
            .from('videos')
            .upload(fileName, buffer, { contentType: 'video/webm' });
        if (!error && data) {
            const { data: urlData } = await supabase.storage
                .from('videos')
                .createSignedUrl(fileName, 60 * 60 * 24 * 7);
            videoUrl = urlData?.signedUrl || null;
        }
    } catch (err) {
        console.error('视频处理失败:', err);
    }
}

const { data, error } = await supabase
    .from('responses')
    .insert([{ q1, q2: q2 || null, q30: q30 || null, q31: q31 || null, video_url: videoUrl }]);
