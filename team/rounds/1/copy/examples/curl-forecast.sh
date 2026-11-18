curl -s https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json \
  | jq '.cities[] | select(.id == 1080500)
        | {name, read_at, days: [.days[] | {date, t_min_c, t_max_c, rain_prob_pct}]}'
