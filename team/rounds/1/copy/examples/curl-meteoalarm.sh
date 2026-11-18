curl -s https://data.promptugal.news/api/v1/meteoalarm-pt/latest.json \
  | jq '{read_at, attribution, first: (.messages[0] | {sent_utc})}'
