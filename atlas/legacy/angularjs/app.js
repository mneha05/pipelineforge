angular.module("atlasLegacy", [])
  .controller("ClusterController", ["$http", function ($http) {
    var vm = this;

    vm.refresh = function () {
      vm.error = null;
      $http.get("/api/atlas/status")
        .then(function (response) { vm.snapshot = response.data; })
        .catch(function (error) { vm.error = "status fetch failed: " + error.status; });
    };

    vm.refresh();
  }]);
