angular.module('myApp').controller('homeCtrl', function($scope, homeService,user, $state){

    $scope.test = homeService.test;

    homeService.users().then(users => {
        console.log(users)
        $scope.users = users.data;
    })

    // user comes from resolve, will either be the user obj or error message we send from server
    console.log(user);
    // if user.data and user.data.err then user = err
    // else user = user object from database
    $scope.user = user.data && user.data.err ? user.data.err : user;
})