SELECT id,(data) FROM people LIMIT 1

-- build the application index
-- create a custom aggregator to be able to get all the all the tags belonging to one user into one row
DROP AGGREGATE IF EXISTS array_accum(anyelement);
CREATE AGGREGATE array_accum (
     sfunc = array_append,
     basetype = anyelement,
     stype = anyarray,
     initcond = '{}'
); 

-- go!
UPDATE people SET tags = x.my_tags, tsv = x.my_tsv FROM 
	(SELECT id AS my_id, array_accum(tag) AS my_tags, array_to_string(array_accum(tag),' ')::tsvector AS my_tsv FROM
	(SELECT id, json_array_elements(data->'top_tags')->>'tag_name'::varchar(32) AS tag FROM people) t
	GROUP BY id) x  

	WHERE id = x.my_id;

-- now add a db index for faster query
CREATE INDEX idx_tsv ON people USING GIN(tsv)
CREATE INDEX idx_karma ON people(( (data->>'reputation')::integer) ); -- seems to be not used?

CREATE INDEX idx_karma_cache ON people(cache_reputation);
UPDATE people SET cache_reputation = (data->>'reputation')::integer;

-- so how is it going?
SELECT id FROM people WHERE tsv @@ to_tsquery('javascript & php') ORDER BY data->>'reputation' DESC OFFSET 500 LIMIT 500;
SELECT id, cache_reputation, data FROM people WHERE tsv @@ to_tsquery('javascript & php') ORDER BY cache_reputation DESC LIMIT 50;
-- it's clear that performance when querying on the JSON for ORDER BY is not good. index seems to be unused.

-- adding geo!
CREATE TABLE geocode (
	location_string varchar(128) primary key,
	cnt integer,
	data json);
INSERT INTO geocode (SELECT (data->>'location') AS location_string, COUNT(*) AS cnt, NULL as data FROM people GROUP BY data->>'location' HAVING (data->>'location') IS NOT NULL AND COUNT(*) > 3 ORDER BY COUNT(*) DESC);