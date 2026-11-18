curl -s https://data.promptugal.news/api/v1/ipma-warnings/reads.json \
  | jq -r '.runs[0:5][] | "\(.at)\tok \(.ok)\tfailed \(.failed)"'
