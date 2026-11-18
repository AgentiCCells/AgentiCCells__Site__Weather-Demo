curl -s https://data.promptugal.news/api/v1/ipma-warnings/latest.json \
  | jq -r '"read at \(.read_at)",
           (.active[] | "\(.level)\t\(.area_name)\t\(.type)\t\(.start) to \(.end)")'
