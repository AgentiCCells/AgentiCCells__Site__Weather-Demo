curl -s https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json \
  | jq -r '.cities[] | "\(.id)\t\(.name)"'
