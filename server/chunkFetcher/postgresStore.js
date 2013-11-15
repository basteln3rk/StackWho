//
var _ = require('underscore');
var pg = require('pg');
var stackWhoConfig = require('../common/config.js');
var Q = require('q');

var PostgresStore = function() {
	var self = {};

	self.append = function(chunk) {
		// save the 'chunk' to the people database
		pg.connect(stackWhoConfig.pgConString, function(err, client, done) {
				if (err) {
					throw err;
				}

				function insertAnotherOne() {
					var currentChunk = chunk.shift();
					console.log('currentChunk', currentChunk);
					if (!currentChunk) {
						done();
						return;
					}
					var args = [currentChunk.user_id, currentChunk, currentChunk.reputation,
							_.map(currentChunk.top_tags, function(tag) {
								return tag.tag_name
							}).join(' ')];
					client.query('INSERT INTO people (id, data, cache_reputation, tsv) VALUES ($1, $2, $3, $4::tsvector)', 
						args,
							function(err, result) {
								if (err) {
									// probably duplicate key or something. just ignore
								}
								insertAnotherOne();
							});
					};
					insertAnotherOne();
				});
		};

		// returns a promise
		self.getLowestReputation = function() {
			var deferred = Q.defer();
			pg.connect(stackWhoConfig.pgConString, function(err, client, done) {
				if (err) {
					deferred.reject(err);
					console.log('!! db err',err);
					return (false);
				}
				client.query('SELECT MIN(cache_reputation) AS min_reputation FROM people', [], function(err, result) {
					done();
					if (err) {
						deferred.reject(err);
					} else {
						deferred.resolve(result.rows[0] ? result.rows[0] : false);
					}
				});
			});
			return deferred.promise;
		}

		// return array of users sorted by reputation. 
		// @param array answerTags
		// @param array locations
		// @returns promise
		self.getFiltered = function(answerTags, locations) {

		}

		return self;
	}

	module.exports = PostgresStore;