#!/bin/zsh
# 批次抓取台灣上市個股資訊
# 用法： ./batch-fetch-twse-equities.sh 2024-10-01 2024-10-31

start_date="$1"
end_date="$2"

if [[ -z "$start_date" || -z "$end_date" ]]; then
  echo "請輸入起始與結束日期 (YYYY-MM-DD)"
  exit 1
fi

date="$start_date"
while [[ "$date" < "$end_date" || "$date" == "$end_date" ]]; do
  echo "抓取 $date ..."
  curl -s -X POST "http://localhost:3000/ticker/fetch-twse-equities" -H "Content-Type: application/json" -d '{"date": "'$date'"}'
  date=$(date -j -v+1d -f "%Y-%m-%d" "$date" +"%Y-%m-%d")
done
echo "批次抓取完成！"
