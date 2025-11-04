#!/bin/bash

# 台股資料收集系統 - Git 版控管理腳本
# 使用方法: ./git-backup.sh [action] [message]

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🔧 台股資料收集系統 - Git 版控管理${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 檢查 Git 狀態
check_git_status() {
    echo -e "${BLUE}📊 檢查 Git 狀態...${NC}"
    
    # 檢查是否有未提交的變更
    if ! git diff-index --quiet HEAD --; then
        print_warning "發現未提交的變更"
        git status --short
        return 1
    else
        print_status "工作目錄乾淨"
        return 0
    fi
}

# 快速備份當前狀態
quick_backup() {
    local message=${1:-"快速備份: $(date '+%Y-%m-%d %H:%M:%S')"}
    
    print_header
    echo -e "${BLUE}🚀 執行快速備份...${NC}"
    
    # 添加所有變更
    git add .
    
    # 檢查是否有變更要提交
    if git diff-index --quiet --cached HEAD --; then
        print_warning "沒有變更需要備份"
        return 0
    fi
    
    # 提交變更
    git commit -m "$message"
    print_status "備份完成: $message"
    
    # 顯示最近的提交
    echo -e "${BLUE}📝 最近的提交記錄:${NC}"
    git log --oneline -5
}

# 建立功能分支
create_feature_branch() {
    local branch_name="$1"
    
    if [ -z "$branch_name" ]; then
        print_error "請提供分支名稱"
        echo "使用方法: $0 feature <branch-name>"
        exit 1
    fi
    
    print_header
    echo -e "${BLUE}🌿 建立功能分支: $branch_name${NC}"
    
    # 確保工作目錄乾淨
    if ! check_git_status; then
        quick_backup "建立分支前的自動備份"
    fi
    
    # 建立並切換分支
    git checkout -b "$branch_name"
    print_status "成功建立並切換到分支: $branch_name"
}

# 合併分支
merge_branch() {
    local branch_name="$1"
    local target_branch="${2:-main}"
    
    if [ -z "$branch_name" ]; then
        print_error "請提供要合併的分支名稱"
        echo "使用方法: $0 merge <branch-name> [target-branch]"
        exit 1
    fi
    
    print_header
    echo -e "${BLUE}🔄 合併分支 $branch_name 到 $target_branch${NC}"
    
    # 切換到目標分支
    git checkout "$target_branch"
    
    # 合併分支
    git merge "$branch_name" --no-ff -m "合併功能分支: $branch_name"
    print_status "成功合併分支: $branch_name"
    
    # 詢問是否刪除功能分支
    echo -e "${YELLOW}是否刪除功能分支 $branch_name? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git branch -d "$branch_name"
        print_status "已刪除分支: $branch_name"
    fi
}

# 顯示分支狀態
show_branches() {
    print_header
    echo -e "${BLUE}🌳 分支狀態:${NC}"
    git branch -v
    
    echo -e "\n${BLUE}📊 最近的提交:${NC}"
    git log --oneline --graph -10
}

# 標記版本
tag_version() {
    local version="$1"
    local message="$2"
    
    if [ -z "$version" ]; then
        print_error "請提供版本號"
        echo "使用方法: $0 tag <version> [message]"
        exit 1
    fi
    
    local tag_message="${message:-"版本發布: $version"}"
    
    print_header
    echo -e "${BLUE}🏷️  建立版本標籤: $version${NC}"
    
    # 確保工作目錄乾淨
    if ! check_git_status; then
        print_error "請先提交所有變更再建立標籤"
        exit 1
    fi
    
    # 建立標籤
    git tag -a "$version" -m "$tag_message"
    print_status "成功建立標籤: $version"
    
    # 顯示所有標籤
    echo -e "${BLUE}📋 所有版本標籤:${NC}"
    git tag -l
}

# 主要邏輯
main() {
    case "$1" in
        "backup"|"b")
            quick_backup "$2"
            ;;
        "feature"|"f")
            create_feature_branch "$2"
            ;;
        "merge"|"m")
            merge_branch "$2" "$3"
            ;;
        "status"|"s")
            show_branches
            ;;
        "tag"|"t")
            tag_version "$2" "$3"
            ;;
        "help"|"h"|"")
            print_header
            echo -e "${BLUE}📖 使用說明:${NC}"
            echo ""
            echo "  $0 backup [message]     - 快速備份當前狀態"
            echo "  $0 feature <name>       - 建立功能分支"
            echo "  $0 merge <branch>       - 合併分支到 main"
            echo "  $0 status               - 顯示分支和提交狀態"
            echo "  $0 tag <version>        - 建立版本標籤"
            echo "  $0 help                 - 顯示此說明"
            echo ""
            echo -e "${BLUE}📝 範例:${NC}"
            echo "  $0 backup \"修復API問題\""
            echo "  $0 feature holiday-fix"
            echo "  $0 merge feature/new-api"
            echo "  $0 tag v1.0.0 \"首次正式版本\""
            ;;
        *)
            print_error "未知的操作: $1"
            echo "使用 '$0 help' 查看使用說明"
            exit 1
            ;;
    esac
}

# 檢查是否在 Git 儲存庫中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "當前目錄不是 Git 儲存庫"
    exit 1
fi

# 執行主要邏輯
main "$@"