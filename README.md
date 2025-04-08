# Typewriter Ranking-Gen:

Simple, clean web application to rank participants based on typing speed and error count from CSV files.

## Sample CSV Format

```
Name,Time,Errors
John,1:30,2
Jane,1:45,1
```

## Scoring

- Time and errors are weighted in a 1:10 ratio
- Each error adds 10 seconds to the total time
- Lower total score means better ranking
