const express = require('express');
const uuid = require('uuid/v4');
const { isWebUri } = require('valid-url')
const logger = require('../logger');
const { bookmarks } = require('../store');
const bookmarksRouter = express.Router();
const bodyParser = express.json();
const { DB_URL } = require('../config');
const BookmarksService = require('../../bookmarks-service')

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks)
            })
            
    })
    .post(bodyParser, (req, res) => {
        const knexInstance = req.app.get('db');
        const { title, url, description, rating } = req.body;

        if (!title) {
            logger.error(`Title is required`);
            return res.status(400).send(`Title is required`);
        }

        if (!url) {
            logger.error(`URL is required`);
            return res.status(400).send(`URL is required`);
        }

        if (!description) {
            logger.error(`Description is required`);
            return res.status(400).send(`Description is required`);
        }

        if (!rating) {
            logger.error(`Rating is required`);
            return res.status(400).send(`Rating is required`);
        }

        if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`${rating} is an invalid rating. Rating must be an integer between 0 and 5.`)
            return res.status(400).send(`Rating must be an integer between 0 and 5`)
        }

        if (!isWebUri(url)) {
            logger.error(`${url} is not a valid URL.`)
            return res.status(400).send('Invalid URL')
        }

        const bookmark = { id: uuid(), title, url, description, rating }

        BookmarksService.insertBookmark(knexInstance, bookmark)
        logger.info(`Bookmark with id ${bookmark.id} created.`)
        res.status(201).location(`http://localhost:8000/bookmarks/${bookmark.id}`).json(bookmark)
    })


bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const knexInstance = req.app.get('db')
        const { id } = req.params;
        BookmarksService.getById(knexInstance, id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} was not found.`);
                    return res.status(404).json({ error: { message: `Bookmark does not exist` } })
                }
                res.json(bookmark)
            })
    })
    .delete((req, res) => {
        const knexInstance = req.app.get('db')
        const { id } = req.params;
        BookmarksService.deleteBookmark(knexInstance, id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`)
                    return res.status(404).json({ error: { message: `Bookmark does not exist` } })
                }
                logger.info(`Bookmark with id ${id} deleted.`);
                res.status(204).end()
        })
    })

module.exports = bookmarksRouter;