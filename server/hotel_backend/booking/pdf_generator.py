import base64
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from django.utils import timezone


class EReceiptGenerator:
    """Generates PDF e-receipts for bookings"""
    
    # Brand colors (matching Azurea Hotel design)
    PRIMARY_COLOR = colors.HexColor('#6F00FF')  # Brand purple
    SECONDARY_COLOR = colors.HexColor('#3B0270')  # Brand secondary
    ACCENT_COLOR = colors.HexColor('#E9B3FB')  # Brand accent
    SUCCESS_COLOR = colors.HexColor('#4CAF50')
    LIGHT_GRAY = colors.HexColor('#F5F5F5')
    DARK_GRAY = colors.HexColor('#424242')
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=self.PRIMARY_COLOR,
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.white,
            backColor=self.PRIMARY_COLOR,
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='FieldLabel',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.SECONDARY_COLOR,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='FieldValue',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.DARK_GRAY,
            fontName='Helvetica'
        ))
    
    def generate_pdf_base64(self, booking_data):
        """
        Generate PDF receipt and return as base64 string
        
        Args:
            booking_data (dict): Booking data from serializer
            
        Returns:
            str: Base64 encoded PDF string
        """
        # Create PDF in memory
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch
        )
        
        # Build the PDF content
        story = self._build_pdf_content(booking_data)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF as bytes and convert to base64
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.getvalue()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return f"data:application/pdf;base64,{pdf_base64}"
    
    def _build_pdf_content(self, booking_data):
        """Build the PDF content as a list of Platypus elements"""
        elements = []
        
        # Header
        elements.extend(self._create_header(booking_data))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Receipt Info Card
        elements.extend(self._create_receipt_info(booking_data))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Guest Information
        elements.extend(self._create_guest_info(booking_data))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Accommodation Details
        elements.extend(self._create_accommodation_details(booking_data))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Payment Summary
        elements.extend(self._create_payment_summary(booking_data))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Thank You Section
        elements.extend(self._create_thank_you_section())
        elements.append(Spacer(1, 0.2 * inch))
        
        # Footer
        elements.extend(self._create_footer())
        
        return elements
    
    def _create_header(self, booking_data):
        """Create header section"""
        elements = []
        
        # Hotel name
        hotel_info = booking_data.get('receipt_data', {}).get('hotel_info', {})
        hotel_name = hotel_info.get('name', 'AZUREA HOTEL & RESORT')
        
        title = Paragraph(
            f"<b>{hotel_name}</b><br/><font size=12>ELECTRONIC RECEIPT</font>",
            self.styles['CustomTitle']
        )
        elements.append(title)
        
        # Contact info
        address = hotel_info.get('address', 'Brgy. Dayap, Calauan, Laguna')
        phone = hotel_info.get('phone', '+63 912 345 6789')
        email = hotel_info.get('email', 'azureahotelmanagement@gmail.com')
        
        contact_text = f"{address} | {phone} | {email}"
        contact = Paragraph(contact_text, ParagraphStyle(
            name='Contact',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=self.DARK_GRAY,
            alignment=TA_CENTER
        ))
        elements.append(contact)
        
        return elements
    
    def _create_receipt_info(self, booking_data):
        """Create receipt information card"""
        elements = []
        
        receipt_data = booking_data.get('receipt_data', {})
        receipt_number = receipt_data.get('receipt_number', f"REC-{booking_data.get('id', 'N/A')}")
        generated_at = receipt_data.get('generated_at', timezone.now().isoformat())
        
        # Parse datetime
        try:
            dt = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
            generated_date = dt.strftime("%b %d, %Y at %I:%M %p")
        except:
            generated_date = "N/A"
        
        booking_id = f"#{str(booking_data.get('id', 'N/A')).zfill(6)}"
        
        # Create receipt info table
        receipt_info_data = [
            [
                f"<b>Receipt No:</b><br/>{receipt_number}",
                f"<b>Booking ID:</b><br/>{booking_id}",
                f"<b>Status:</b><br/><font color=green>CHECKED OUT</font>"
            ],
            [
                f"<b>Generated:</b><br/>{generated_date}",
                "",
                ""
            ]
        ]
        
        receipt_table = Table(receipt_info_data, colWidths=[2*inch, 2*inch, 1.5*inch])
        receipt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.LIGHT_GRAY),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.DARK_GRAY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('BORDER', (0, 0), (-1, -1), 1),
            ('BORDERCOLOR', (0, 0), (-1, -1), self.PRIMARY_COLOR),
        ]))
        
        elements.append(receipt_table)
        return elements
    
    def _create_guest_info(self, booking_data):
        """Create guest information section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>GUEST INFORMATION</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Guest data
        user = booking_data.get('user', {})
        guest_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or 'N/A'
        email = user.get('email', 'N/A')
        phone = booking_data.get('phone_number', 'N/A')
        
        guest_data = [
            ['Guest Name:', guest_name],
            ['Email Address:', email],
            ['Phone Number:', phone],
        ]
        
        guest_table = Table(guest_data, colWidths=[1.5*inch, 4*inch])
        guest_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), self.SECONDARY_COLOR),
            ('TEXTCOLOR', (1, 0), (1, -1), self.DARK_GRAY),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(guest_table)
        return elements
    
    def _create_accommodation_details(self, booking_data):
        """Create accommodation details section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>ACCOMMODATION DETAILS</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Accommodation data
        property_type = booking_data.get('property_type', 'Room')
        property_name = booking_data.get('property_name', 'N/A')
        
        # Format dates
        check_in_date = booking_data.get('check_in_date')
        check_out_date = booking_data.get('check_out_date')
        
        check_in_str = 'N/A'
        check_out_str = 'N/A'
        
        if check_in_date:
            try:
                dt = datetime.fromisoformat(check_in_date.replace('Z', '+00:00'))
                check_in_str = dt.strftime("%A, %B %d, %Y")
            except:
                check_in_str = str(check_in_date)
        
        if check_out_date:
            try:
                dt = datetime.fromisoformat(check_out_date.replace('Z', '+00:00'))
                check_out_str = dt.strftime("%A, %B %d, %Y")
            except:
                check_out_str = str(check_out_date)
        
        duration = booking_data.get('duration', 'N/A')
        guests = booking_data.get('number_of_guests', 1)
        guest_text = f"{guests} guest{'s' if guests > 1 else ''}"
        
        accommodation_data = [
            ['Property Type:', property_type],
            ['Property Name:', property_name],
            ['Check-in Date:', check_in_str],
            ['Check-out Date:', check_out_str],
            ['Duration of Stay:', duration],
            ['Number of Guests:', guest_text],
        ]
        
        # Add special requests if present
        special_request = booking_data.get('special_request')
        if special_request:
            accommodation_data.append(['Special Requests:', special_request])
        
        accommodation_table = Table(accommodation_data, colWidths=[1.5*inch, 4*inch])
        accommodation_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), self.SECONDARY_COLOR),
            ('TEXTCOLOR', (1, 0), (1, -1), self.DARK_GRAY),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(accommodation_table)
        return elements
    
    def _create_payment_summary(self, booking_data):
        """Create payment summary section"""
        elements = []
        
        # Section header
        header = Paragraph("<b>PAYMENT SUMMARY</b>", self.styles['SectionHeader'])
        elements.append(header)
        
        # Payment data
        payment = booking_data.get('payment_breakdown', {})
        
        down_payment = payment.get('down_payment', 0)
        remaining_balance = payment.get('remaining_balance', 0)
        total_amount = payment.get('total_amount', 0)
        payment_method = payment.get('payment_method', 'N/A')
        payment_status = payment.get('payment_status', 'N/A')
        
        # Format currency
        def format_currency(amount):
            try:
                return f"₱{float(amount):,.2f}"
            except:
                return str(amount)
        
        # Create payment table
        payment_data = []
        
        if down_payment > 0:
            payment_data.append(['Down Payment', format_currency(down_payment)])
        
        if remaining_balance > 0:
            payment_data.append(['Remaining Balance', format_currency(remaining_balance)])
        
        payment_data.append(['TOTAL AMOUNT PAID', format_currency(total_amount)])
        
        payment_table = Table(payment_data, colWidths=[4*inch, 1.5*inch])
        payment_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 9),
            ('FONTSIZE', (0, -1), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (-1, -1), self.DARK_GRAY),
            ('BACKGROUND', (0, -1), (-1, -1), self.LIGHT_GRAY),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('LINEABOVE', (0, -1), (-1, -1), 1, self.PRIMARY_COLOR),
            ('LINEBELOW', (0, -1), (-1, -1), 1, self.PRIMARY_COLOR),
        ]))
        
        elements.append(payment_table)
        
        # Add payment method and status
        elements.append(Spacer(1, 0.1 * inch))
        
        payment_info = [
            ['Payment Method:', payment_method],
            ['Payment Status:', payment_status],
        ]
        
        payment_info_table = Table(payment_info, colWidths=[1.5*inch, 4*inch])
        payment_info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), self.SECONDARY_COLOR),
            ('TEXTCOLOR', (1, 0), (1, -1), self.DARK_GRAY),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(payment_info_table)
        return elements
    
    def _create_thank_you_section(self):
        """Create thank you section"""
        elements = []
        
        thank_you = Paragraph(
            "<b>Thank you for choosing Azurea Hotel!</b><br/>"
            "We hope you enjoyed your stay with us!",
            ParagraphStyle(
                name='ThankYou',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=self.PRIMARY_COLOR,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
        )
        
        elements.append(thank_you)
        return elements
    
    def _create_footer(self):
        """Create footer section"""
        elements = []
        
        current_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        
        footer_text = (
            "This is a computer-generated receipt and does not require a signature.<br/>"
            "For any inquiries regarding this receipt, please contact our front desk.<br/>"
            f"Generated on {current_date}"
        )
        
        footer = Paragraph(
            footer_text,
            ParagraphStyle(
                name='Footer',
                parent=self.styles['Normal'],
                fontSize=8,
                textColor=colors.grey,
                alignment=TA_CENTER
            )
        )
        
        elements.append(footer)
        return elements
