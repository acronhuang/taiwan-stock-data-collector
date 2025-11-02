#!/bin/bash

# GitHub 推送腳本
# 請先在 GitHub 建立儲存庫，然後執行此腳本

echo "🚀 === 推送到 GitHub 儲存庫 ==="
echo ""

# 檢查是否提供 GitHub 儲存庫 URL
if [ -z "$1" ]; then
    echo "❌ 請提供 GitHub 儲存庫 URL"
    echo ""
    echo "使用方法:"
    echo "  $0 https://github.com/yourusername/taiwan-stock-data-collector.git"
    echo ""
    echo "📝 步驟:"
    echo "1. 前往 https://github.com"
    echo "2. 建立新儲存庫 'taiwan-stock-data-collector'"
    echo "3. 複製 HTTPS 或 SSH URL"
    echo "4. 執行: $0 [YOUR_REPO_URL]"
    exit 1
fi

REPO_URL="$1"

echo "📊 檢查本地 Git 狀態..."
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 當前目錄不是 Git 儲存庫"
    exit 1
fi

echo "✅ Git 儲存庫確認"

# 添加遠端儲存庫
echo "🔗 添加遠端儲存庫..."
git remote add origin "$REPO_URL" 2>/dev/null || {
    echo "⚠️  遠端儲存庫已存在，更新 URL..."
    git remote set-url origin "$REPO_URL"
}

echo "✅ 遠端儲存庫設定完成"

# 推送主分支
echo "📤 推送主分支到 GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ 主分支推送成功"
else
    echo "❌ 推送失敗，請檢查："
    echo "   1. GitHub 儲存庫 URL 是否正確"
    echo "   2. 是否有權限推送到該儲存庫"
    echo "   3. 網路連線是否正常"
    exit 1
fi

# 推送所有標籤
echo "🏷️  推送版本標籤..."
git push origin --tags

# 推送其他分支
echo "🌿 推送其他分支..."
for branch in $(git branch | grep -v "main" | sed 's/^\*//' | xargs); do
    echo "   推送分支: $branch"
    git push origin "$branch"
done

echo ""
echo "🎉 === 推送完成！==="
echo ""
echo "📋 GitHub 儲存庫資訊:"
echo "   URL: $REPO_URL"
echo "   主分支: main"
echo "   版本標籤: $(git tag | wc -l | xargs) 個"
echo "   總分支: $(git branch -a | wc -l | xargs) 個"
echo ""
echo "🌐 您的專案現在可以在以下網址查看:"
echo "   ${REPO_URL%.git}"
echo ""