const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

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
    const { q1, q2, q30, q31, video_url } = req.body;

    if (!q1) {
        return res.status(400).json({ error: '请回答第1题' });
    }

    try {
        const { data, error } = await supabase
            .from('responses')
            .insert([{ q1, q2: q2 || null, q30: q30 || null, q31: q31 || null, video_url: video_url || null }]);

        if (error) {
            console.error('Supabase插入失败:', error);
            return res.status(500).json({ error: '数据存储失败，请稍后重试' });
        }

        res.json({ success: true, message: '提交成功' });
    } catch (err) {
        console.error('服务器错误:', err);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('服务器已启动，端口:' + PORT);
});
