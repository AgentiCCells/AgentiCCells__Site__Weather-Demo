curl -s https://data.promptugal.news/api/v1/ipma-warnings/latest.json \
  | jq -r '.read_at as $r | (now - ($r | fromdateiso8601)) / 3600
           | "read \($r), \(. * 10 | floor / 10) hours ago"
             + (if . > 3 then ": stale, say so beside the figures" else "" end)'
