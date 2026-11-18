curl -s https://data.promptugal.news/api/v1/index.json \
  | jq -r '.sources[] | "\(.id)\t\(.cadence)\t\(.read_at)"'
