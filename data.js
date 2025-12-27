/**
 * Skole-Dashboard Data
 * format: HH:MM
 */

window.SkoleData = {
    days: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'],
    schedules: {
        valhalla: [
            // Mandag
            {
                dayIndex: 1, dayName: 'Mandag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Fie + Karen', start: '09:15', end: '09:20', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Fie + Karen', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '10:30', end: '11:20', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '11:30', end: '12:00', color: 'var(--color-subject-2)' }
                ]
            },
            // Tirsdag
            {
                dayIndex: 2, dayName: 'Tirsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:15', end: '09:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:30', end: '10:00', color: 'var(--color-subject-1)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '10:30', end: '11:20', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '11:30', end: '12:00', color: 'var(--color-subject-2)' }
                ]
            },
            // Onsdag
            {
                dayIndex: 3, dayName: 'Onsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Fie + Karen', start: '09:15', end: '09:20', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Fie + Karen', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Valgfag', teacher: '', start: '10:30', end: '12:00', color: 'var(--color-subject-7)' }
                ]
            },
            // Torsdag
            {
                dayIndex: 4, dayName: 'Torsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:15', end: '09:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:30', end: '10:00', color: 'var(--color-subject-1)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '10:30', end: '11:20', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '11:30', end: '12:00', color: 'var(--color-subject-2)' }
                ]
            },
            // Fredag
            {
                dayIndex: 5, dayName: 'Fredag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:15', end: '09:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '09:30', end: '10:00', color: 'var(--color-subject-1)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills', teacher: '', start: '10:30', end: '11:20', color: 'var(--color-subject-11)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills', teacher: '', start: '11:30', end: '12:00', color: 'var(--color-subject-11)' }
                ]
            }
        ],
        udgaard: [
            // Mandag
            {
                dayIndex: 1, dayName: 'Mandag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Tirsdag
            {
                dayIndex: 2, dayName: 'Tirsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Fie + Mikkel', start: '08:45', end: '09:15', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Fie + Mikkel', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Onsdag
            {
                dayIndex: 3, dayName: 'Onsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Valgfag', teacher: '', start: '10:30', end: '11:20', color: 'var(--color-subject-7)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Valgfag', teacher: '', start: '11:30', end: '12:00', color: 'var(--color-subject-7)' }
                ]
            },
            // Torsdag
            {
                dayIndex: 4, dayName: 'Torsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Fie', start: '08:45', end: '09:15', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Fie', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Karen + Lars', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Fredag
            {
                dayIndex: 5, dayName: 'Fredag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Rasmus + Mikkel', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills + hygge', teacher: '', start: '10:30', end: '11:20', color: 'var(--color-subject-11)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills + hygge', teacher: '', start: '11:30', end: '12:00', color: 'var(--color-subject-11)' }
                ]
            }
        ],
        asgaard: [
            // Mandag
            {
                dayIndex: 1, dayName: 'Mandag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Lars', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Lars', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Tirsdag
            {
                dayIndex: 2, dayName: 'Tirsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Rasmus', start: '08:45', end: '09:15', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Rasmus', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Onsdag
            {
                dayIndex: 3, dayName: 'Onsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Lars', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Lars', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Valgfag', teacher: '', start: '10:30', end: '11:20', color: 'var(--color-subject-7)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Valgfag', teacher: '', start: '11:30', end: '12:00', color: 'var(--color-subject-7)' }
                ]
            },
            // Torsdag
            {
                dayIndex: 4, dayName: 'Torsdag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Engelsk', teacher: 'Rasmus', start: '08:45', end: '09:15', color: 'var(--color-subject-3)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Engelsk', teacher: 'Rasmus', start: '09:30', end: '10:00', color: 'var(--color-subject-3)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '10:30', end: '11:20', color: 'var(--color-subject-1)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Dansk', teacher: 'Fie', start: '11:30', end: '12:00', color: 'var(--color-subject-1)' }
                ]
            },
            // Fredag
            {
                dayIndex: 5, dayName: 'Fredag', lessons: [
                    { subject: 'Morgensamling', teacher: '', start: '08:30', end: '08:45', color: 'var(--color-subject-12)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '08:45', end: '09:15', color: 'var(--color-subject-2)' },
                    { subject: 'Pause', teacher: '', start: '09:20', end: '09:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Matematik', teacher: 'Mikkel + Rasmus', start: '09:30', end: '10:00', color: 'var(--color-subject-2)' },
                    { subject: 'Brunch', teacher: '', start: '10:00', end: '10:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills + hygge', teacher: '', start: '10:30', end: '11:20', color: 'var(--color-subject-11)' },
                    { subject: 'Pause', teacher: '', start: '11:20', end: '11:30', type: 'break', color: 'var(--color-break)' },
                    { subject: 'Lifeskills + hygge', teacher: '', start: '11:30', end: '12:00', color: 'var(--color-subject-11)' }
                ]
            }
        ]
    },
    students: [
        { name: 'Alberte B.', full: 'Alberte Braad Egerton Simonsen', bday: '10. feb' },
        { name: 'Alberte H.', full: 'Alberte Holm', bday: '28. mar' },
        { name: 'Allis', full: 'Allis Maria Helena Buitenhuis', bday: '12. apr' },
        { name: 'Amalie', full: 'Amalie Leegaard Ingvardsen', bday: '31. mar' },
        { name: 'Anne C.', full: 'Anne Møller Christensen', bday: '30. sep' },
        { name: 'Anne S.', full: 'Anne Sofie Dahlstrøm Severinsen', bday: '21. aug' },
        { name: 'Caroline', full: 'Caroline Mørup Gammelgaard', bday: '5. jan' },
        { name: 'Cecilie', full: 'Cecilie Elva Hansen Svendsen', bday: '19. aug' },
        { name: 'Christian', full: 'Christian Rohde Keller', bday: '18. aug' },
        { name: 'Emilie', full: 'Emilie Filskov Kristensen', bday: '3. jan' },
        { name: 'Emma', full: 'Emma Thougaard Slot', bday: '3. maj' },
        { name: 'Gustav', full: 'Gustav Venø Mortensen', bday: '10. jun' },
        { name: 'Ivanna', full: 'Ivanna Alessandra Lopez Barocio', bday: '20. okt' },
        { name: 'Josefine', full: 'Josefine Werge', bday: '6. jun' },
        { name: 'Julie', full: 'Julie Xiaoye Lykke', bday: '22. jan' },
        { name: 'Karen', full: 'Karen Brænder Nørgaard', bday: '30. aug' },
        { name: 'Kathrine', full: 'Kathrine Davidsen Binderup', bday: '13. aug' },
        { name: 'Katrine', full: 'Katrine Kuur Bergmann', bday: '26. aug' },
        { name: 'Laura', full: 'Laura Samuel Pedersen', bday: '30. nov' },
        { name: 'Lisa', full: 'Lisa Nielsen', bday: '6. jan' },
        { name: 'Lærke B.', full: 'Lærke Hjortkær Baltzersen', bday: '26. aug' },
        { name: 'Lærke T.', full: 'Lærke Kristiane Thorup', bday: '28. jun' },
        { name: 'Madeline', full: 'Madeline Kirstine Karred Folmand', bday: '28. okt' },
        { name: 'Mai', full: 'Mai Sofie Søgaard', bday: '22. dec' },
        { name: 'Maja', full: 'Maja Lise Skov Pilgaard', bday: '21. aug' },
        { name: 'Malou A.', full: 'Malou Cantzler Kirkegaard Andersen', bday: '2. mar' },
        { name: 'Malou H.', full: 'Malou Kjærgaard Harbo', bday: '23. okt' },
        { name: 'Mathias', full: 'Mathias Ørtoft Iversen', bday: '25. sep' },
        { name: 'Nanna', full: 'Nanna Ørskov Klynge Ellegaard', bday: '8. feb' },
        { name: 'Nelly', full: 'Nelly Inge Almsgaard Boldrup', bday: '9. jan' },
        { name: 'Oskar', full: 'Oskar Jungberg Pedersen', bday: '31. jul' },
        { name: 'Ronja', full: 'Ronja Bach Pedersen', bday: '25. mar' },
        { name: 'Sasia', full: 'Sasia Hinnerup Ingemann Jønsson', bday: '6. maj' },
        { name: 'Sebastian', full: 'Sebastian Krogh Poulsen', bday: '30. dec' },
        { name: 'Silje', full: 'Silje Elkjær', bday: '15. dec' },
        { name: 'Tilde', full: 'Tilde Svendsen Skjalm', bday: '27. jul' },
        { name: 'Tobias', full: 'Tobias Schaarup Skinderholm', bday: '8. aug' },
        { name: 'Tristan', full: 'Tristan Henneberg Astrup', bday: '30. jun' },
        { name: 'Victoria', full: 'Victoria Schou Jakobsen', bday: '16. jan' }
    ],
    teachers: [
        'Hanne Bech Feldt',
        'Mikkel Lægteskov Sø Madsen',
        'Karen Eeg Smidt',
        'Jesper Borg Jensen',
        'Fie Værge',
        'Lars Mink Karlsen',
        'Ida Skovsen Nørgaard'
    ],
    quotes: [
        "Husk nu, der findes ingen dumme spørgsmål, kun dumme svar.",
        "Kan vi få lidt ro nede bagved?",
        "Det her er meget vigtigt for eksamen!",
        "Er der nogen, der har lavet lektier i dag?",
        "Læg telefonerne væk, ellers ryger de i skuffen.",
        "Jeg venter bare på, at I bliver færdige med at snakke...",
        "Det står alt sammen på Lectio.",
        "Husk at række hånden op!",
        "Vi tager lige en 5 minutters stræk-ben pause (måske).",
        "Det her pensum har vi altså gennemgået før.",
        "Er der nogen der vil op til tavlen?",
        "Vi skal nå kapitel 4 inden ferien."
    ],
    // Årsplan Data 2025/26
    oneNoteLinks: {
        'default': 'https://viborgskoler15-my.sharepoint.com/personal/mikk767f_viborgskoler_dk/_layouts/15/Doc.aspx?sourcedoc={430f4aef-960a-4f3f-85ed-12473b3c199b}', // Base OneNote
        'Dansk': 'https://viborgskoler15-my.sharepoint.com/personal/mikk767f_viborgskoler_dk/_layouts/15/Doc.aspx?sourcedoc={430f4aef-960a-4f3f-85ed-12473b3c199b}&action=view&wd=target%28%40Undervisning%2F%40Valhalla%2FDansk.one%7C9bb91ed7-1a94-4739-a5cb-89547a8e604e%2FNovelle%20-%20Den%20blomstrende%20have%7C94f38ed4-d164-4a02-bec2-7a78dc760ad0%2F%29&wdorigin=NavigationUrl', // Specific link for now
        'Matematik': 'https://viborgskoler15-my.sharepoint.com/personal/mikk767f_viborgskoler_dk/_layouts/15/Doc.aspx?sourcedoc={430f4aef-960a-4f3f-85ed-12473b3c199b}' // Fallback
    },
    yearPlan: {
        'Matematik': [
            { title: 'Tal & Forståelse', weeks: [35, 36], description: 'Gange, division, mængder' },
            { title: 'Tal & Algebra', weeks: [37, 38, 39, 40, 41, 43], description: 'Procenter, brøker, ligninger, funktioner' },
            { title: 'Geometri & Måling', weeks: [44, 48, 49, 50, 2, 3, 4], description: 'Areal, rumfang, Pythagoras' },
            { title: 'Terminsprøver', weeks: [45, 46, 47], description: 'Træning og prøver' },
            { title: 'Trigonometri', weeks: [5, 6, 8], description: 'Vinkler og trekanter' },
            { title: 'Statistik', weeks: [9, 15, 16, 17], description: 'Økonomi og undersøgelser' },
            { title: 'Skitur / Prøver', weeks: [10, 11, 12, 13], description: 'Skitur og Terminsprøver' },
            { title: 'Eksamen', weeks: [18, 19, 21], description: 'FP9/FP10 Forberedelse' }
        ],
        'Dansk': [
            { title: 'Identitet', weeks: [35, 36, 37], description: 'Noveller, SoMe, Kortfilm' },
            { title: 'Romantikken', weeks: [38, 39, 40, 41], description: 'H.C. Andersen, Guldalderen' },
            { title: 'Tove Ditlevsen', weeks: [43, 44, 45], description: 'Tove i stykker, Film' },
            { title: 'Livet på kanten', weeks: [48], description: 'Dokumentarer' },
            { title: 'Netetik', weeks: [2, 3], description: 'At være på 24-7' },
            { title: 'Døden', weeks: [8], description: 'At miste' },
            { title: 'Roman: 1-2-3 NU', weeks: [9], description: 'Jesper Wung-Sung' },
            { title: 'Markante Kvinder', weeks: [15, 16, 17, 18], description: 'Historiske profiler' },
            { title: 'Eksamen', weeks: [19, 21], description: 'Skriftlig og mundtlig' }
        ]
    }
};
