import Layout from "./Layout.jsx";

import Dimensions from "./Dimensions";

import LiveLoads from "./LiveLoads";

import BTX from "./BTX";

import Call-Ins from "./Call-Ins";

import Truckloads from "./Truckloads";

import Changeovers from "./Changeovers";

import Line-Counts from "./Line-Counts";

import Help from "./Help";

import DockDoors from "./DockDoors";

import AdminDashboard from "./AdminDashboard";

import UserApproval from "./UserApproval";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dimensions: Dimensions,
    
    LiveLoads: LiveLoads,
    
    BTX: BTX,
    
    Call-Ins: Call-Ins,
    
    Truckloads: Truckloads,
    
    Changeovers: Changeovers,
    
    Line-Counts: Line-Counts,
    
    Help: Help,
    
    DockDoors: DockDoors,
    
    AdminDashboard: AdminDashboard,
    
    UserApproval: UserApproval,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dimensions />} />
                
                
                <Route path="/Dimensions" element={<Dimensions />} />
                
                <Route path="/LiveLoads" element={<LiveLoads />} />
                
                <Route path="/BTX" element={<BTX />} />
                
                <Route path="/Call-Ins" element={<Call-Ins />} />
                
                <Route path="/Truckloads" element={<Truckloads />} />
                
                <Route path="/Changeovers" element={<Changeovers />} />
                
                <Route path="/Line-Counts" element={<Line-Counts />} />
                
                <Route path="/Help" element={<Help />} />
                
                <Route path="/DockDoors" element={<DockDoors />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/UserApproval" element={<UserApproval />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}