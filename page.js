var client;
var refreshTodoItems;

var createTableService = function(client) {
     var todoItemTable = client.getTable('todoitem');

     return {
         readTodoItems: function(filter) {
             return todoItemTable.where(filter).read();
         },
         insertTodoItem: function(item) {
             return todoItemTable.insert(item);
         },
         updateTodoItem: function(item) {
             return todoItemTable.update(item);
         },
         deleteTodoItem: function(id) {
             return todoItemTable.del({ id: id });
         }
     };
};

var createAzureService = function(client) {
    return {
        readTodoItems: function(filter) {
            return client.invokeApi('todoitem', {
                method: 'GET' ,
                parameters: filter
            })
            .then(function(results) { return results.result; });
        },
        insertTodoItem: function(item) {
            return client.invokeApi('todoitem', {
                method: 'POST',
                body: item
            })
            .then(function(results) { return results.result; });
        },
        updateTodoItem: function(item) {
            return client.invokeApi('todoitem', {
                method: 'PUT',
                body: item,
                parameters: { id: item.id }
            })
            .then(function(results) { return results.result; });
        },
        deleteTodoItem: function(id) {
            return client.invokeApi('todoitem', {
                method: 'DELETE',
                parameters: { id: id }
            })
            .then(function(results) { return results.result; });
        }
    };
};

$(function() {
    client = new WindowsAzure.MobileServiceClient('https://masakura.azure-mobile.net/', 'dFauNYqxydJnqxJtnqjgnZKSVIthcl24');
    var service = createAzureService(client);

    // Read current data and rebuild UI.
    // If you plan to generate complex UIs like this, consider using a JavaScript templating library.
    refreshTodoItems = function() {
        var refresh = function(todoItems) {
            var listItems = $.map(todoItems, function(item) {
                return $('<li>')
                    .attr('data-todoitem-id', item.id)
                    .append($('<button class="item-delete">Delete</button>'))
                    .append($('<input type="checkbox" class="item-complete">').prop('checked', item.complete))
                    .append($('<div>').append($('<input class="item-text">').val(item.text)));
            });

            $('#todo-items').empty().append(listItems).toggle(listItems.length > 0);
            $('#summary').html('<strong>' + todoItems.length + '</strong> item(s)');
        };

        service.readTodoItems({ complete: false })
            .then(refresh, handleError);
    }

    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        $('#errorlog').append($('<li>').text(text));
    }

    function getTodoItemId(formElement) {
        return $(formElement).closest('li').attr('data-todoitem-id');
    }

    // Handle insert
    $('#add-item').submit(function(evt) {
        var textbox = $('#new-item-text'),
            itemText = textbox.val();
        if (itemText !== '') {
            service.insertTodoItem({ text: itemText, complete: false })
                .then(refreshTodoItems, handleError);
        }
        textbox.val('').focus();
        evt.preventDefault();
    });

    // Handle update
    $(document.body).on('change', '.item-text', function() {
        var newText = $(this).val();
        service.updateTodoItem({ id: getTodoItemId(this), text: newText })
            .then(null, handleError);
    });

    $(document.body).on('change', '.item-complete', function() {
        var isComplete = $(this).prop('checked');
        service.updateTodoItem({ id: getTodoItemId(this), complete: isComplete })
            .then(refreshTodoItems, handleError);
    });

    // Handle delete
    $(document.body).on('click', '.item-delete', function () {
        service.deleteTodoItem(getTodoItemId(this))
            .then(refreshTodoItems, handleError);
    });
});

function refreshAuthDisplay() {
    var isLoggedIn = client.currentUser !== null;
    $("#logged-in").toggle(isLoggedIn);
    $("#logged-out").toggle(!isLoggedIn);

    if (isLoggedIn) {
        $("#login-name").text(client.currentUser.userId);
        refreshTodoItems();
    }
}

function logIn() {
    client.login("google").then(refreshAuthDisplay, function(error){
        alert(error);
    });
}

function logOut() {
    client.logout();
    refreshAuthDisplay();
    $('#summary').html('<strong>You must login to access data.</strong>');
}

// On page init, fetch the data and set up event handlers
$(function () {
     refreshAuthDisplay();
     $('#summary').html('<strong>You must login to access data.</strong>');          
     $("#logged-out button").click(logIn);
     $("#logged-in button").click(logOut);
});
