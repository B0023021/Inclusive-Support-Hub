import { supabase } from './supabaseClient.js'

export async function uploadAndDetect(file) {
  // ① ユーザー取得
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("ログインしてない")

  // ② Supabase Storage にアップロード
  const filePath = `${user.id}/${crypto.randomUUID()}.jpg`

  await supabase.storage
    .from("env-images")
    .upload(filePath, file)

  // ③ バックエンドの /api/detect を呼び出す
  const res = await fetch("http://<サーバIP>:3000/api/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      image_path: filePath
    })
  })

  return await res.json()
}
