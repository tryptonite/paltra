
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, HelpCircle, Search, Package, Truck, Phone, Plane, ArrowRightLeft, BarChart3, FileText, Warehouse } from 'lucide-react';

const helpSections = [
  { id: 'introduction', title: 'Introduction', icon: HelpCircle },
  { id: 'dock-doors', title: 'Dock Doors', icon: Warehouse },
  { id: 'live-loads', title: 'Live Loads', icon: Truck },
  { id: 'call-ins', title: 'Call-Ins', icon: Phone },
  { id: 'dimensions', title: 'Dimensions', icon: Package },
  { id: 'changeovers', title: 'Changeovers', icon: ArrowRightLeft },
  { id: 'btx', title: 'BTX', icon: Plane },
  { id: 'truckloads', title: 'Truckloads', icon: Truck },
  { id: 'line-counts', title: 'Line Counts', icon: BarChart3 }
];


const HelpSection = ({ id, title, children }) =>
  <section id={id} className="mb-12 scroll-mt-24">
    <Card className="shadow-lg border-slate-200 rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
        <CardTitle className="text-2xl font-bold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-slate-700 leading-relaxed">
        {children}
      </CardContent>
    </Card>
  </section>;


const FaqItem = ({ question, children }) =>
  <Collapsible>
    <CollapsibleTrigger className="flex justify-between items-center w-full text-left font-semibold text-slate-800 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      {question}
      <ChevronsUpDown className="h-4 w-4" />
    </CollapsibleTrigger>
    <CollapsibleContent className="p-4 pt-2 text-slate-600">
      {children}
    </CollapsibleContent>
  </Collapsible>;


export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      window.history.pushState(null, null, `#${sectionId}`);
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const filteredSections = helpSections.filter((section) =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:sticky lg:top-8 self-start">
        <Card className="p-4 rounded-2xl shadow-md border-slate-200">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-lg" />

          </div>
          <nav className="space-y-1">
            {filteredSections.map((section) =>
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleNavClick(e, section.id)}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">

                <section.icon className="h-4 w-4" />
                {section.title}
              </a>
            )}
          </nav>
        </Card>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <HelpSection id="introduction" title="Introduction">
          <p className="mb-4">Welcome to the Paltra Warehouse Portal! This application is designed to streamline and centralize various warehouse operations, from submitting vital information in a timely manner to managing truckload schedules. This guide will walk you through each feature of the app.</p>
          <p className="mb-6">Use the navigation on the left to jump to a specific section. Each guide provides an overview, step-by-step instructions, and answers to frequently asked questions.</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Need Additional Help?</h4>
            <p className="text-blue-700">For more help or feedback, email us at <a href="mailto:support@paltra.us" className="font-semibold underline hover:text-blue-900">support@paltra.us</a></p>
          </div>
        </HelpSection>

        <HelpSection id="dock-doors" title="Dock Doors Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">The Dock Doors page allows you to manage and track the real-time status of warehouse dock doors, including carrier assignments and trailer information.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Click on any dock door card to open the management dialog.</li>
            <li>Select the appropriate status: "Available", "Loading", or "Out-of-service".</li>
            <li>If assigning a carrier, enter the "Carrier" name and "Trailer #".</li>
            <li>When you enter carrier or trailer information, the status will automatically change to "Loading".</li>
            <li>Click "Save Changes" to update the dock door.</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Important Notes:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Making a door Available:</strong> To set a dock door status to "Available", you must clear both the Carrier and Trailer # fields completely.</li>
            <li><strong>Auto-status change:</strong> Entering any carrier or trailer information will automatically change the status to "Loading".</li>
            <li><strong>Out-of-service:</strong> Use this status when a dock door is temporarily unavailable for operations.</li>
          </ul>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Dock Door Layout:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>ED Section:</strong> Dock doors 12-21 and 23</li>
            <li><strong>Retail Section:</strong> Dock doors 25-32</li>
          </ul>
        </HelpSection>

        <HelpSection id="live-loads" title="Live Loads Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">The Live Loads page is used to track the number of pallets and cartons being loaded onto trucks for various carriers in real-time throughout the day.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Select a carrier from the "Carrier" dropdown menu.</li>
            <li>Enter the number of pallets for "P&S Pallets" and "AVD Pallets".</li>
            <li>Under the "95 Department" section, enter counts for "Raceway Pallets," "Fitting Pallets," and "Cartons."</li>
            <li>The "Total Summary" on the right will update automatically as you type.</li>
            <li>Click "Submit Load" to save the entry. A confirmation dialog will appear before final submission.</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Space Calculator:</strong> After submitting data, the "Today's Summary by Carrier" table will appear. Click on any carrier row to open the Space Calculator, which tells you the total spots needed on the truck.</li>
            <li><strong>Undo:</strong> After submitting, a notification will appear with an "Undo" button, allowing you to delete the entry within 10 seconds.</li>
          </ul>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">FAQs</h3>
          <FaqItem question="Why does the summary table reset?">
            <p>The "Today's Summary" data resets every night at 11:00 PM EST to ensure a fresh start for the next business day.</p>
          </FaqItem>
        </HelpSection>

        <HelpSection id="call-ins" title="Call-Ins Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">Use the Call-Ins page to notify the shipping department when a trailer is ready for pickup.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Enter the "Dock Door" number if known (optional).</li>
            <li>Select the "Carrier" and enter the "Trailer #".</li>
            <li>For "Ready Time," either select a specific time or choose "Now" to have the system round to the nearest hour.</li>
            <li>Click "Submit Call-In."</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Date & Carrier Filtering:</strong> You can view call-ins for any specific date and filter the list by carrier using the controls at the top of the "Today's Call-Ins" table.</li>
          </ul>
        </HelpSection>

        <HelpSection id="dimensions" title="Dimensions Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">This page allows you to record the dimensions (Length, Width, Height) for individual skids and cartons associated with a specific shipment.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Enter the "Ship Via" carrier, "Control #", and "Wave #".</li>
            <li>Under "Skid Dimensions," click "Add skid" to create a new row. Enter the L/W/H for each skid.</li>
            <li>Do the same for "Carton Dimensions."</li>
            <li>Click "Save Dimensions." You can view details of past entries by clicking on a row in the "Recent Entries" table.</li>
          </ol>
        </HelpSection>

        <HelpSection id="changeovers" title="Changeovers Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">This page is for requesting a change in the shipping carrier for a specific order (identified by a Control Number).</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Select the department initiating the change.</li>
            <li>Enter the "Original Ship Via" (the old carrier) and the "New Ship Via" (the new carrier).</li>
            <li>Fill in the Control #, Wave #, and the number of pallets/cartons.</li>
            <li>If the department is "AVD," you must also enter the SO# and Delivery#.</li>
            <li>Provide a clear "Reason for Change."</li>
            <li>Click "Submit Changeover."</li>
          </ol>
        </HelpSection>

        <HelpSection id="btx" title="BTX Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">The BTX page is for logging air freight shipments, including their dimensions and tracking numbers.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Select the "Shipment Type" (e.g., BXA, BXP).</li>
            <li>Enter the "Control #" and "Wave #".</li>
            <li>Add pallet and/or carton dimensions as needed.</li>
            <li>For shipping department users, enter the "Tracking Number." The "NCS" prefix is automatically handled.</li>
            <li>Click "Submit BTX Entry."</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Editing:</strong> You can edit the dimensions of a past entry by clicking on a specific entry in the Recent Entries table.</li>
          </ul>
        </HelpSection>

        <HelpSection id="truckloads" title="Truckloads Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">This page provides a comprehensive schedule for all outgoing truckloads. It allows you to create, view, edit, and mark truckloads as completed.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Use the "New Truckload" form to add an entry. Fields like "Control #" and "PO #" allow multiple entries—type a number and press Enter to add it to the list.</li>
            <li>Select a "Pickup Date," "Department," "Destination," etc.</li>
            <li>Click "Add Truckload" to add it to the "Active Truckloads" table.</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Weekly Calendar:</strong> The calendar at the top shows a count of truckloads scheduled for each day. Click a date to filter the "Active Truckloads" table to show only loads for that day.</li>
            <li><strong>Mark as Completed:</strong> In the "Active Truckloads" table, check the box in the "Completed" column to move a record to the "Picked Up Truckloads" table.</li>
            <li><strong>Details & Editing:</strong> Click any row to view full details. From the details view, you can edit the entry or mark it as complete.</li>
          </ul>
        </HelpSection>

        <HelpSection id="line-counts" title="Line Counts Guide">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">What is it for?</h3>
          <p className="mb-4">This page is used to log the number of order lines for Wiremold-95 at two key points in the day: 2:00 PM and 5:00 PM. This data helps track daily workload and throughput.</p>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">How to use it:</h3>
          <ol className="list-decimal list-inside space-y-2 mb-4">
            <li>Select the "Date" and "Time Period" (2PM or 5PM).</li>
            <li>Enter the line counts for "Preferreds," "Parcels," and "LTL."</li>
            <li>Manually enter the total in the "Total" field.</li>
            <li>Click "Save Line Count."</li>
          </ol>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-2 mb-4">
            <li><strong>Daily Average Chart:</strong> A line chart at the bottom of the page visualizes the average total line counts over time.</li>
            <li><strong>Undo:</strong> After submitting, a notification will appear for 10 seconds allowing you to undo the submission.</li>
          </ul>
        </HelpSection>

      </main>
    </div>
  );
}
