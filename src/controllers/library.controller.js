const { LibraryScanService } = require("../services/library-scan.service");

class LibraryController {
  static async scan(req, res, next) {
    try {
      const removeMissing = !!(req.body && req.body.removeMissing);
      const dryRun = !!(req.body && req.body.dryRun);

      const report = await LibraryScanService.scan({ removeMissing, dryRun });
      res.json(report);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { LibraryController };
