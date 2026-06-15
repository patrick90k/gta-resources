local isOpen = false

local function setBusDutyAppOpen(open)
    isOpen = open
    SetNuiFocus(open, open)
    SendNUIMessage({
        type = open and 'open' or 'close'
    })
end

RegisterCommand('busdienst', function()
    setBusDutyAppOpen(not isOpen)
end, false)

RegisterKeyMapping('busdienst', 'Busfahrer Dienst-App öffnen', 'keyboard', 'F7')

RegisterNUICallback('close', function(_, cb)
    setBusDutyAppOpen(false)
    cb('ok')
end)
