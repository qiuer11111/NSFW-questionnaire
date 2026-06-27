const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));  // 允许大文件传输

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('错误: 请设置环境变量 SUPABASE_URL 和 SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '问卷API服务运行中' });
});

app.post('/api/submit', async (req, res) => {
    const { q1, q2, q30, q31, video_base64 } = req.body;

    if (!q1) {
        return res.status(400).json({ error: '请回答第1题' });
    }

    let videoUrl = null;

    // 处理视频：Base64解码并上传到Supabase Storage
    if (video_base64) {
        try {
            // 去掉 data:video/webm;base64, 前缀（如果有）
            const base64Data = video_base64.split(',')[1] || video_base64;
            const buffer = Buffer.from(base64Data, 'base64');
            
            if (buffer.length > 0) {
                const fileName = 'video_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.webm';
                
                const { data, error } = await supabase.storage
                    .from('videos')
                    .upload(fileName, buffer, { 
                        contentType: 'video/webm',
                        cacheControl: '3600'
                    });

                if (error) {
                    console.error('Supabase上传失败:', error);
                } else if (data) {
                    // 生成签名URL（7天有效期）
                    const { data: urlData } = await supabase.storage
                        .from('videos')
                        .createSignedUrl(fileName, 60 * 60 * 24 * 7);
                    
                    videoUrl = urlData?.signedUrl || null;
                }
            }
        } catch (err) {
            console.error('视频处理异常:', err);
        }
    }

    try {
        const { data, error } = await supabase
            .from('responses')
            .insert([{ 
                q1: q1, 
                q2: q2 || null, 
                q30: q30 || null, 
                q31: q31 || null, 
                video_url: videoUrl 
            }]);

        if (error) {
            console.error('Supabase插入失败:', error);
            return res.status(500).json({ error: '数据存储失败，请稍后重试' });
        }

        res.json({ success: true, message: '提交成功', video_url: videoUrl });
    } catch (err) {
        console.error('服务器错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('服务器已启动，端口:' + PORT);
});
